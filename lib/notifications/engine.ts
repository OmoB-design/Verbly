/**
 * Verbly notification planner — deterministic, testable "who gets what" logic.
 *
 * The scheduled cron runs daily and calls this per caregiver. It respects the
 * caregiver's single frequency setting (daily / weekly / off) for BOTH
 * notification types (data-driven nudges + encouragement lines), per
 * ARCHITECTURE.md. Pure: the route handler assembles the facts (last-sent time,
 * children, pending events) and does the sending/logging.
 */

import {
  renderMilestone,
  renderRetakeSuggestion,
  renderSessionReminder,
  renderReassessmentDue,
  renderEncouragement,
} from "./templates";

export type Frequency = "daily" | "weekly" | "off";
export type NotificationType =
  | "session_reminder"
  | "milestone"
  | "retake_suggestion"
  | "reassessment_due"
  | "encouragement";

export interface PlannedNotification {
  type: NotificationType;
  /** Unique-per-caregiver key; a matching notifications_log row means "already sent". */
  dedupeKey: string;
  childId: string | null;
  subject: string;
  body: string;
}

export interface PlannerChild {
  id: string;
  name: string;
  lastSessionAt: number | null; // ms since epoch, or null if never
}

export interface PendingEvent {
  id: string; // source row id (phase_history / session_instance) → stable dedupe
  childId: string;
  childName: string;
  phaseNumber?: number | null;
}

export interface PlannerContext {
  frequency: Frequency;
  now: number; // ms
  lastSentAt: number | null; // most recent notifications_log.created_at for this caregiver, ms
  reminderThresholdMs: number;
  children: PlannerChild[];
  pendingMilestones: PendingEvent[];
  pendingRetakes: PendingEvent[];
  /** Assessments whose suggested reassessment interval has elapsed (id =
   *  assessment id → nudged at most once per assessment, ever). */
  pendingReassessments: PendingEvent[];
  /** Encouragement line pre-selected by the caller (rotated by period). */
  encouragementLine: string;
  /** Stable per-period bucket string (e.g. "d20301" / "w2901") for reminder +
   *  encouragement dedupe keys, so a caregiver gets at most one per period. */
  periodBucket: string;
}

// A cadence window slightly under the nominal period, tolerant of cron drift.
export const DAILY_MS = 20 * 60 * 60 * 1000; // ~20h
export const WEEKLY_MS = 6.5 * 24 * 60 * 60 * 1000; // ~6.5 days

function cadenceMs(f: Frequency): number {
  return f === "daily" ? DAILY_MS : WEEKLY_MS;
}

/** Is this caregiver due for a dispatch this run? */
export function isEligible(ctx: Pick<PlannerContext, "frequency" | "now" | "lastSentAt">): boolean {
  if (ctx.frequency === "off") return false;
  if (ctx.lastSentAt === null) return true;
  return ctx.now - ctx.lastSentAt >= cadenceMs(ctx.frequency);
}

export function planNotifications(ctx: PlannerContext): PlannedNotification[] {
  if (!isEligible(ctx)) return [];

  const out: PlannedNotification[] = [];

  // Event-driven nudges (deduped by the source row id → emailed at most once).
  for (const m of ctx.pendingMilestones) {
    const r = renderMilestone(m.childName, m.phaseNumber);
    out.push({ type: "milestone", dedupeKey: `milestone:${m.id}`, childId: m.childId, ...r });
  }
  for (const rk of ctx.pendingRetakes) {
    const r = renderRetakeSuggestion(rk.childName);
    out.push({ type: "retake_suggestion", dedupeKey: `retake:${rk.id}`, childId: rk.childId, ...r });
  }

  // Reassessment check-ins — once per elapsed assessment (§11 nudge).
  for (const ra of ctx.pendingReassessments) {
    const r = renderReassessmentDue(ra.childName);
    out.push({ type: "reassessment_due", dedupeKey: `reassess:${ra.id}`, childId: ra.childId, ...r });
  }

  // Session reminders — one per stale child per period.
  for (const c of ctx.children) {
    const stale = c.lastSessionAt === null || ctx.now - c.lastSessionAt >= ctx.reminderThresholdMs;
    if (stale) {
      const r = renderSessionReminder(c.name);
      out.push({
        type: "session_reminder",
        dedupeKey: `reminder:${c.id}:${ctx.periodBucket}`,
        childId: c.id,
        ...r,
      });
    }
  }

  // One encouragement line per period.
  out.push({
    type: "encouragement",
    dedupeKey: `encouragement:${ctx.periodBucket}`,
    childId: null,
    ...renderEncouragement(ctx.encouragementLine),
  });

  return out;
}
