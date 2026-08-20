"use client";

import { Button } from "@/components/ui/button";

/** Root error boundary — calm, recoverable, never a stack trace. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        Not your fault — a hiccup on our side. Nothing you&apos;ve done is lost; sessions and answers save as you go.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button asChild variant="outline">
          <a href="/dashboard">Go home</a>
        </Button>
      </div>
    </main>
  );
}
