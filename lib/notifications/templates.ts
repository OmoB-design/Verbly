/**
 * Caregiver-facing email copy. Pressure-free tone per DESIGN.md — this must
 * hold up warmly even for a "retake" nudge, never reading as failure.
 *
 * This is PRODUCT copy (the "small original bank of caregiver-facing copy" from
 * ARCHITECTURE.md), NOT the SLP-reviewed clinical curriculum. Final wording
 * should still get a review pass — flagged, not treated as settled.
 */

const CLINICAL_FOOTER =
  "Verbly supports home practice and is not a substitute for professional evaluation by a speech-language pathologist.";

function withFooter(body: string): string {
  return `${body}\n\n— \n${CLINICAL_FOOTER}`;
}

export interface RenderedEmail {
  subject: string;
  body: string;
}

export function renderMilestone(childName: string, phaseNumber?: number | null): RenderedEmail {
  const where = phaseNumber ? ` — now on Phase ${phaseNumber}` : "";
  return {
    subject: `A lovely step forward for ${childName}`,
    body: withFooter(
      `Great news: ${childName} just moved forward in their journey${where}. ` +
        `Every step here reflects real, patient work from both of you. Nice going.`,
    ),
  };
}

export function renderRetakeSuggestion(childName: string): RenderedEmail {
  return {
    subject: `A gentle idea for ${childName}'s next session`,
    body: withFooter(
      `${childName}'s last session was a little trickier — which is simply information, not a setback. ` +
        `When you're ready, Verbly will offer a version built for right where ${childName} is today. ` +
        `No rush, and nothing to fix.`,
    ),
  };
}

export function renderSessionReminder(childName: string): RenderedEmail {
  return {
    subject: `Ready when you are — a moment with ${childName}`,
    body: withFooter(
      `It's been a little while since your last session with ${childName}. Even a few minutes counts. ` +
        `Whenever today suits you, Verbly will be ready.`,
    ),
  };
}

/** §11: reassessment nudges read as a natural check-in ("let's see how things
 *  are going"), never as "retake the test". */
export function renderReassessmentDue(childName: string): RenderedEmail {
  return {
    subject: `Let's see how things are going with ${childName}`,
    body: withFooter(
      `It's been a little while since ${childName}'s Communication Compass. Children change quickly — ` +
        `a fresh look takes about ten minutes and keeps the activities matched to where ${childName} is now. ` +
        `You'll find it under ${childName}'s settings whenever you're ready.`,
    ),
  };
}

export function renderEncouragement(line: string): RenderedEmail {
  return { subject: "A small note from Verbly", body: withFooter(line) };
}

/** Rotated by dispatch period so a caregiver doesn't get the same line twice in a row. */
export const ENCOURAGEMENT_BANK: string[] = [
  "Showing up — even on the hard days — is the work. You're doing it.",
  "Small, steady moments add up to real change. Thank you for the ones you give.",
  "There is no perfect session, only present ones. You showed up, and that matters.",
  "Progress is rarely a straight line. Your patience is doing more than you can see.",
  "You know your child best. Trust that — Verbly is only here to help.",
  "Every gentle try builds something. Be as kind to yourself as you are to them.",
];
