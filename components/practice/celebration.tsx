"use client";

import * as React from "react";

/**
 * One-shot confetti burst for phase graduations — the emotional peak of the
 * whole loop, and the one place the UI is allowed to be loud. Pure CSS
 * animation (keyframes in globals.css), removes itself when done, and
 * prefers-reduced-motion hides it entirely.
 */

const COLORS = ["#f59e0b", "#fb923c", "#22c55e", "#14b8a6", "#38bdf8", "#818cf8", "#e879f9", "#fb7185"];
const PIECES = 28;

export function Celebration() {
  const [gone, setGone] = React.useState(false);
  // Randomized once per mount, client-only (this component is rendered only
  // after a live user action, so there's no SSR-hydration mismatch to avoid).
  const pieces = React.useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 2 + Math.random() * 1.2,
        color: COLORS[i % COLORS.length],
        tilt: Math.random() * 360,
      })),
    [],
  );

  React.useEffect(() => {
    const t = setTimeout(() => setGone(true), 4200);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.tilt}deg)`,
          }}
        />
      ))}
    </div>
  );
}
