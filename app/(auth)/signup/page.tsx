"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useState } from "react";

import { signup } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, undefined);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [isSlp, setIsSlp] = useState(searchParams.get("type") === "slp");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {isSlp ? "Create an SLP account" : "Create a caregiver account"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isSlp
            ? "For speech-language pathologists invited by a family — read their child's records and leave notes the family can see."
            : "No SLP approval needed — accounts are always self-serve."}
        </p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {isSlp ? <input type="hidden" name="account_type" value="slp" /> : null}
        <div className="grid gap-2">
          <Label htmlFor="full_name">Your name (optional)</Label>
          <Input id="full_name" name="full_name" type="text" autoComplete="name" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        {state?.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground">
        Verbly is a screening and home-practice tool, not a substitute for
        professional evaluation.
      </p>

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-primary underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>

      <button
        type="button"
        onClick={() => setIsSlp((v) => !v)}
        className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {isSlp ? "I'm a caregiver — switch back" : "I'm a speech-language pathologist"}
      </button>
    </main>
  );
}
