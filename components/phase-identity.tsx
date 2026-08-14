import {
  Copy,
  Eye,
  Footprints,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  MessageCircleHeart,
  MessageCircleQuestion,
  MessageSquareText,
  Mic,
  Users,
  Wind,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * PRESENTATION-ONLY phase identity: each of the 12 phases gets a stable hue +
 * icon so "Phase 7" reads as *the blue sentence-building one*, not a bare
 * number. Cluster logic: foundations 1–3 are sunrise warms, the PECS journey
 * 4–9 moves through water/sky blues, social 10–11 are violets/greens, speech
 * 12 is rose.
 *
 * NOT clinical content (names/thresholds live in versioned content), and per
 * §11 these identities must never encode or display age information. Class
 * strings are literal so Tailwind sees them at build time.
 */

export interface PhaseIdentity {
  Icon: LucideIcon;
  /** Small labeled chip (badge-like). */
  chip: string;
  /** Circular icon holder. */
  iconWrap: string;
  /** Card border accent for highlighted/current cards. */
  cardAccent: string;
  /** Progress-bar fill. */
  bar: string;
}

const IDENTITIES: Record<number, PhaseIdentity> = {
  1: { Icon: Eye, chip: "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/50 dark:text-amber-200 dark:border-amber-800", iconWrap: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300", cardAccent: "border-amber-300/80 dark:border-amber-700/60", bar: "bg-amber-500" },
  2: { Icon: Copy, chip: "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800", iconWrap: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300", cardAccent: "border-orange-300/80 dark:border-orange-700/60", bar: "bg-orange-500" },
  3: { Icon: Wind, chip: "bg-lime-100 text-lime-900 border-lime-200 dark:bg-lime-950/50 dark:text-lime-200 dark:border-lime-800", iconWrap: "bg-lime-100 text-lime-700 dark:bg-lime-950/60 dark:text-lime-300", cardAccent: "border-lime-300/80 dark:border-lime-700/60", bar: "bg-lime-500" },
  4: { Icon: ImageIcon, chip: "bg-teal-100 text-teal-900 border-teal-200 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800", iconWrap: "bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300", cardAccent: "border-teal-300/80 dark:border-teal-700/60", bar: "bg-teal-500" },
  5: { Icon: Footprints, chip: "bg-cyan-100 text-cyan-900 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-800", iconWrap: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300", cardAccent: "border-cyan-300/80 dark:border-cyan-700/60", bar: "bg-cyan-500" },
  6: { Icon: LayoutGrid, chip: "bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800", iconWrap: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300", cardAccent: "border-sky-300/80 dark:border-sky-700/60", bar: "bg-sky-500" },
  7: { Icon: MessageSquareText, chip: "bg-blue-100 text-blue-900 border-blue-200 dark:bg-blue-950/50 dark:text-blue-200 dark:border-blue-800", iconWrap: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300", cardAccent: "border-blue-300/80 dark:border-blue-700/60", bar: "bg-blue-500" },
  8: { Icon: MessageCircleQuestion, chip: "bg-indigo-100 text-indigo-900 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-200 dark:border-indigo-800", iconWrap: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300", cardAccent: "border-indigo-300/80 dark:border-indigo-700/60", bar: "bg-indigo-500" },
  9: { Icon: MessageCircleHeart, chip: "bg-violet-100 text-violet-900 border-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:border-violet-800", iconWrap: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300", cardAccent: "border-violet-300/80 dark:border-violet-700/60", bar: "bg-violet-500" },
  10: { Icon: Users, chip: "bg-fuchsia-100 text-fuchsia-900 border-fuchsia-200 dark:bg-fuchsia-950/50 dark:text-fuchsia-200 dark:border-fuchsia-800", iconWrap: "bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-300", cardAccent: "border-fuchsia-300/80 dark:border-fuchsia-700/60", bar: "bg-fuchsia-500" },
  11: { Icon: Home, chip: "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800", iconWrap: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300", cardAccent: "border-emerald-300/80 dark:border-emerald-700/60", bar: "bg-emerald-500" },
  12: { Icon: Mic, chip: "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/50 dark:text-rose-200 dark:border-rose-800", iconWrap: "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300", cardAccent: "border-rose-300/80 dark:border-rose-700/60", bar: "bg-rose-500" },
};

const FALLBACK: PhaseIdentity = {
  Icon: Eye,
  chip: "bg-muted text-muted-foreground border-border",
  iconWrap: "bg-muted text-muted-foreground",
  cardAccent: "border-border",
  bar: "bg-primary",
};

export function phaseIdentity(phase: number | null | undefined): PhaseIdentity {
  return (phase != null && IDENTITIES[phase]) || FALLBACK;
}

/** Colored phase chip: icon + "Phase N" (+ optional name). */
export function PhaseChip({
  phase,
  name,
  className,
}: {
  phase: number;
  name?: string;
  className?: string;
}) {
  const id = phaseIdentity(phase);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        id.chip,
        className,
      )}
    >
      <id.Icon className="size-3.5" aria-hidden />
      Phase {phase}
      {name ? <span className="hidden font-normal sm:inline"> · {name}</span> : null}
    </span>
  );
}

/** Circular phase icon, for card headers and list rows. */
export function PhaseIconBubble({
  phase,
  size = "md",
  className,
}: {
  phase: number;
  size?: "md" | "lg";
  className?: string;
}) {
  const id = phaseIdentity(phase);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full",
        size === "lg" ? "size-11" : "size-9",
        id.iconWrap,
        className,
      )}
      aria-hidden
    >
      <id.Icon className={size === "lg" ? "size-5" : "size-4"} />
    </span>
  );
}
