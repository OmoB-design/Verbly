import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

/**
 * POST /api/compass/[assessment_id]/resume-link
 *
 * Emails the signed-in caregiver a link back to the child's Communication
 * Compass so they can finish later (§11 "resume link delivered by email").
 * Until Resend has a verified sending domain this runs dry (logs, sends
 * nothing) — the response reports `dry_run` so the UI can stay honest. Only
 * offered while the assessment is still in_progress.
 */
export async function POST(request: Request, { params }: { params: Promise<{ assessment_id: string }> }) {
  const { assessment_id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!user.email) return NextResponse.json({ error: "No email on file for this account" }, { status: 400 });

  // Authorize via RLS (assessment is child-scoped).
  const { data: assessment, error: aErr } = await supabase
    .from("assessments")
    .select("id, child_id, status")
    .eq("id", assessment_id)
    .maybeSingle();
  if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });
  if (!assessment) return NextResponse.json({ error: "Assessment not found or not accessible" }, { status: 403 });
  if (assessment.status !== "in_progress") {
    return NextResponse.json({ error: "This assessment is already complete" }, { status: 409 });
  }

  const admin = createAdminClient();
  const { data: child } = await admin.from("children").select("name").eq("id", assessment.child_id).maybeSingle();
  const childName = child?.name ?? "your child";

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const link = `${base}/children/${assessment.child_id}/compass`;

  const result = await sendEmail({
    to: user.email,
    subject: `Pick up where you left off with ${childName}'s Communication Compass`,
    body:
      `Hi,\n\nYou can continue ${childName}'s Communication Compass whenever you're ready — ` +
      `your answers so far are saved.\n\nContinue here:\n${link}\n\n` +
      `This is a starting point to personalize activities, not a test or a diagnosis.\n`,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Could not send the email" }, { status: 502 });
  }
  return NextResponse.json({ ok: true, dry_run: result.dryRun });
}
