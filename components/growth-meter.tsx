import { Flower2, Sprout, TreeDeciduous } from "lucide-react";

import { cn } from "@/lib/utils";
import { phaseIdentity } from "@/components/phase-identity";

/**
 * §11 "grow-chart, not a clinical bar chart": the 3-consecutive-passes
 * graduation window as sprout → flower → tree. Purely presentational — the
 * count comes from the same trailing-passes computation the engine uses.
 * Color follows the phase identity; each stage is also labeled for a11y.
 */
const STAGES = [
  { Icon: Sprout, label: "first pass" },
  { Icon: Flower2, label: "second pass in a row" },
  { Icon: TreeDeciduous, label: "third pass — new phase!" },
] as const;

export function GrowthMeter({
  value,
  phase,
  className,
}: {
  /** Consecutive passes achieved (0–3, clamped). */
  value: number;
  phase: number;
  className?: string;
}) {
  const v = Math.max(0, Math.min(3, Math.floor(value)));
  const id = phaseIdentity(phase);
  return (
    <div
      role="img"
      aria-label={`${v} of 3 passing sessions in a row toward the next phase`}
      className={cn("flex items-center gap-1", className)}
    >
      {STAGES.map((s, i) => {
        const achieved = i < v;
        return (
          <span key={s.label} className="flex items-center">
            <span
              title={s.label}
              className={cn(
                "flex size-10 items-center justify-center rounded-full border-2 transition-colors",
                achieved ? cn("border-transparent", id.iconWrap) : "border-dashed border-border text-muted-foreground/50",
              )}
            >
              <s.Icon className={cn(i === 2 ? "size-5" : "size-4")} aria-hidden />
            </span>
            {i < STAGES.length - 1 ? (
              <span className={cn("h-0.5 w-4 rounded-full sm:w-8", i < v - 1 ? id.bar : "bg-border")} aria-hidden />
            ) : null}
          </span>
        );
      })}
    </div>
  );
}
