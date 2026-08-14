"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Modal built on the native <dialog> element — focus trapping, ESC-to-close,
 * and top-layer stacking come from the platform, no added dependencies
 * (consistent with our progress/table primitives). Clicking the backdrop
 * closes unless `locked` (e.g. mid-destructive-request).
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  locked = false,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  locked?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        // ESC key: respect `locked` while a request is in flight.
        if (locked) e.preventDefault();
        else onClose();
      }}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (!locked && e.target === ref.current) onClose();
      }}
      className={cn(
        "bg-background text-foreground m-auto w-full max-w-md rounded-xl border p-0 shadow-lg",
        "backdrop:bg-black/50",
        className,
      )}
    >
      <div className="flex flex-col gap-4 p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {children}
      </div>
    </dialog>
  );
}
