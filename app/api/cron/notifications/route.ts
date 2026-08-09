import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, emailConfigured } from "@/lib/email/resend";
import {
  planNotifications,
  type Frequency,
  type PlannerChild,
  type PendingEvent,
} from "@/lib/notifications/engine";
import { ENCOURAGEMENT_BANK } from "@/lib/notifications/templates";

const DAY_MS = 24 * 60 * 60 * 1000;
const REMINDER_THRESHOLD_MS = 3 * DAY_MS;

/**
 * GET /api/cron/notifications  (Vercel Cron target — see vercel.json)
 *
 * Server-authoritative scheduled dispatch. Runs daily; for each caregiver whose
 * frequency isn't "off" and who is due this run, it plans notifications
 * (data-driven nudges + one encouragement line), sends them via Resend (or
 * dry-runs when email isn't provisioned), and records every one in
 * notifications_log for dedupe + audit.
 *
 * Auth: Vercel Cron includes `Authorization: Bearer $CRON_SECRET` when the
 * CRON_SECRET env var is set. We require it. Pass ?dryRun=1 to force dry-run.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const forceDryRun = new URL(request.url).searchParams.get("dryRun") === "1";
  const admin = createAdminClient();
  const nowMs = Date.now();

  const summary = {
    dryRunMode: forceDryRun || !emailConfigured(),
    caregiversConsidered: 0,
    skippedOff: 0,
    planned: 0,
    sent: 0,
    dryRun: 0,
    failed: 0,
    duplicatesSkipped: 0,
  };

  const { data: prefs, error: prefsErr } = await admin
    .from("notification_preferences")
    .select("caregiver_id, frequency");
  if (prefsErr) return NextResponse.json({ error: prefsErr.message }, { status: 500 });

  for (const pref of prefs ?? []) {
    summary.caregiversConsidered += 1;
    const frequency = pref.frequency as Frequency;
    if (frequency === "off") {
      summary.skippedOff += 1;
      continue;
    }
    const caregiverId = pref.caregiver_id as string;

    // Recipient email lives in auth.users.
    const { data: userRes } = await admin.auth.admin.getUserById(caregiverId);
    const email = userRes?.user?.email;
    if (!email) continue;

    // Already-sent dedupe keys + last-sent time.
    const { data: logRows } = await admin
      .from("notifications_log")
      .select("dedupe_key, created_at")
      .eq("caregiver_id", caregiverId);
    const sentKeys = new Set((logRows ?? []).map((r) => r.dedupe_key));
    const lastSentAt = (logRows ?? []).reduce<number | null>((max, r) => {
      const t = Date.parse(r.created_at);
      return max === null || t > max ? t : max;
    }, null);

    // The caregiver's children + each child's last completed session.
    const { data: kids } = await admin
      .from("children")
      .select("id, name")
      .eq("primary_caregiver_id", caregiverId);
    const childName = new Map((kids ?? []).map((k) => [k.id as string, k.name as string]));
    const childIds = [...childName.keys()];

    const lastSessionAt = new Map<string, number>();
    const pendingMilestones: PendingEvent[] = [];
    const pendingRetakes: PendingEvent[] = [];

    if (childIds.length > 0) {
      const { data: sessions } = await admin
        .from("session_instances")
        .select("id, child_id, outcome, completed_at")
        .in("child_id", childIds)
        .not("completed_at", "is", null);
      for (const s of sessions ?? []) {
        const t = Date.parse(s.completed_at);
        const prev = lastSessionAt.get(s.child_id);
        if (prev === undefined || t > prev) lastSessionAt.set(s.child_id, t);
        if (
          (s.outcome === "retake" || s.outcome === "simplify_triggered") &&
          !sentKeys.has(`retake:${s.id}`)
        ) {
          pendingRetakes.push({ id: s.id, childId: s.child_id, childName: childName.get(s.child_id) ?? "your child" });
        }
      }

      const { data: advances } = await admin
        .from("phase_history")
        .select("id, child_id, phase_id")
        .in("child_id", childIds)
        .eq("trigger_reason", "rl_advance");
      const freshAdvances = (advances ?? []).filter((a) => !sentKeys.has(`milestone:${a.id}`));
      // Resolve phase numbers for nicer copy.
      const phaseNumById = new Map<string, number>();
      const phaseIds = [...new Set(freshAdvances.map((a) => a.phase_id))];
      if (phaseIds.length > 0) {
        const { data: phases } = await admin
          .schema("curriculum_content")
          .from("phases")
          .select("id, phase_number")
          .in("id", phaseIds);
        for (const p of phases ?? []) phaseNumById.set(p.id, p.phase_number);
      }
      for (const a of freshAdvances) {
        pendingMilestones.push({
          id: a.id,
          childId: a.child_id,
          childName: childName.get(a.child_id) ?? "your child",
          phaseNumber: phaseNumById.get(a.phase_id) ?? null,
        });
      }
    }

    const children: PlannerChild[] = childIds.map((id) => ({
      id,
      name: childName.get(id) ?? "your child",
      lastSessionAt: lastSessionAt.get(id) ?? null,
    }));

    const periodIndex = frequency === "daily"
      ? Math.floor(nowMs / DAY_MS)
      : Math.floor(nowMs / (7 * DAY_MS));
    const periodBucket = `${frequency === "daily" ? "d" : "w"}${periodIndex}`;

    const planned = planNotifications({
      frequency,
      now: nowMs,
      lastSentAt,
      reminderThresholdMs: REMINDER_THRESHOLD_MS,
      children,
      pendingMilestones,
      pendingRetakes,
      encouragementLine: ENCOURAGEMENT_BANK[periodIndex % ENCOURAGEMENT_BANK.length],
      periodBucket,
    });

    for (const n of planned) {
      if (sentKeys.has(n.dedupeKey)) {
        summary.duplicatesSkipped += 1;
        continue;
      }
      summary.planned += 1;

      const result = forceDryRun
        ? { ok: true, dryRun: true as const }
        : await sendEmail({ to: email, subject: n.subject, body: n.body });
      const status = result.dryRun ? "dry_run" : result.ok ? "sent" : "failed";

      const { data: inserted } = await admin
        .from("notifications_log")
        .upsert(
          {
            caregiver_id: caregiverId,
            child_id: n.childId,
            type: n.type,
            dedupe_key: n.dedupeKey,
            subject: n.subject,
            status,
            error: result.ok ? null : (result as { error?: string }).error ?? null,
          },
          { onConflict: "caregiver_id,dedupe_key", ignoreDuplicates: true },
        )
        .select("id");

      if (!inserted || inserted.length === 0) {
        summary.duplicatesSkipped += 1; // lost a race; another run logged it
        continue;
      }
      if (status === "sent") summary.sent += 1;
      else if (status === "dry_run") summary.dryRun += 1;
      else summary.failed += 1;
    }
  }

  return NextResponse.json(summary);
}
