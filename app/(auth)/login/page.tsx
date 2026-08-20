"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const justSignedUp = searchParams.get("confirm") === "1";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back to Verbly.
        </p>
      </div>

      {justSignedUp ? (
        <p className="rounded-lg border border-primary/30 bg-accent/40 px-3 py-2 text-sm">
          Almost there — check your email and tap the confirmation link, then log in here.
        </p>
      ) : null}

      <form action={formAction} className="flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </div>

        {state?.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <Button type="submit" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>

        <Link
          href="/forgot-password"
          className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Forgot your password?
        </Link>
      </form>

      <p className="text-sm text-muted-foreground">
        No account?{" "}
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="text-primary underline-offset-4 hover:underline"
        >
          Create one
        </Link>
      </p>
    </main>
  );
}
