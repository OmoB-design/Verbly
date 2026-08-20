"use client";

import * as React from "react";
import { RotateCcw } from "lucide-react";

/**
 * Level-1 mouth-movement model (owner spec): a simple looping 2D animation of
 * the target mouth/face shape for Phase 3 (Oral Motor) and Phase 12 (Vocal
 * Approximation) exercises. Content-driven — which animation shows comes from
 * the exercise's `mouth_animation_ref` in versioned content, never from
 * runtime mappings.
 *
 * Assets are self-animating SVG loops at /animations/mouth/<ref>.svg — local
 * files, no network call at play time beyond the initial load, no libraries.
 * NO ASSETS SHIP until the shapes have SLP sign-off (a clinically wrong tongue
 * or lip position modelled to a child is worse than no model): until then the
 * component probes the asset and renders nothing when it's absent.
 *
 * The interface is deliberately prop-stable (`animationRef`) so a richer
 * character can replace the simple face later without touching call sites.
 */
export function MouthModel({ animationRef, className }: { animationRef: string; className?: string }) {
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [replayKey, setReplayKey] = React.useState(0);
  const src = `/animations/mouth/${encodeURIComponent(animationRef)}.svg`;

  React.useEffect(() => {
    let cancelled = false;
    // HEAD probe: hide entirely (no broken frame) while assets await sign-off.
    fetch(src, { method: "HEAD" })
      .then((r) => {
        if (!cancelled) setAvailable(r.ok);
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!available) return null;

  return (
    <div className={"flex flex-col items-center gap-2 rounded-xl border bg-card p-3 " + (className ?? "")}>
      {/* eslint-disable-next-line @next/next/no-img-element -- self-animating
          SVG must load as a document, not a rasterized next/image */}
      <img key={replayKey} src={src} alt="Mouth movement to copy" className="h-32 w-auto" />
      <button
        type="button"
        onClick={() => setReplayKey((k) => k + 1)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs underline-offset-4 hover:underline"
      >
        <RotateCcw className="size-3.5" aria-hidden />
        Replay the movement
      </button>
    </div>
  );
}
