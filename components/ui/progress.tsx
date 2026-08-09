import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Minimal, dependency-free progress bar (no @radix-ui/react-progress). `value`
 * is 0–100. Announces progress to assistive tech via role="progressbar".
 */
function Progress({
  value = 0,
  className,
  label,
  ...props
}: React.ComponentProps<"div"> & { value?: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-label={label}
      data-slot="progress"
      className={cn("bg-primary/15 relative h-2 w-full overflow-hidden rounded-full", className)}
      {...props}
    >
      <div
        className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export { Progress };
