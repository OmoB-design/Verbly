/** Friendly, pressure-free labels for enum values shown to caregivers. */

export type BadgeVariant = "default" | "secondary" | "success" | "destructive" | "outline";

export function outcomeLabel(outcome: string | null): { text: string; variant: BadgeVariant } {
  switch (outcome) {
    case "advance":
      return { text: "Moved forward", variant: "success" };
    case "retake":
      return { text: "Another try", variant: "secondary" };
    case "simplify_triggered":
      return { text: "Simplified version", variant: "outline" };
    default:
      return { text: "In progress", variant: "outline" };
  }
}

export function triggerReasonLabel(reason: string): string {
  switch (reason) {
    case "assessment_placement":
      return "Starting point set";
    case "rl_advance":
      return "Moved forward";
    case "caregiver_regression":
      return "Stepped back (by you)";
    case "caregiver_override":
      return "Adjusted (by you)";
    case "age_bracket_transition":
      return "Age-group update";
    default:
      return reason;
  }
}

export function frequencyLabel(freq: string): string {
  switch (freq) {
    case "daily":
      return "Daily";
    case "weekly":
      return "Weekly";
    case "off":
      return "Off";
    default:
      return freq;
  }
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
