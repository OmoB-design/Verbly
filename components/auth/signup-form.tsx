"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useActionState } from "react";

import { signup } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

/** Caregiver signup. SLPs have their own page at /signup/slp (linked from
 *  invites); `slp` prop switches this shared form into that mode. */
export function SignupForm({ slp = false }: { slp?: boolean }) {
  const [state, formAction, pending] = useActionState(signup, undefined);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {slp ? "Create an SLP account" : "Create your account"}
        </h1>
        {slp ? (
          <p className="text-sm text-muted-foreground">
            For speech-language pathologists invited by a family — read their child&apos;s records and leave notes the
            family can see.
          </p>
        ) : null}
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}
        {slp ? <input type="hidden" name="account_type" value="slp" /> : null}
        <div className="grid gap-2">
          <Label htmlFor="full_name">Your name</Label>
          <Input id="full_name" name="full_name" type="text" autoComplete="name" required className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required className="h-11" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required />
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

      <p className="text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-primary underline-offset-4 hover:underline"
        >
          Log in
        </Link>
      </p>

      {!slp ? (
        <Link
          href={next ? `/signup/slp?next=${encodeURIComponent(next)}` : "/signup/slp"}
          className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          I&apos;m a speech-language pathologist
        </Link>
      ) : (
        <Link
          href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
          className="self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          I&apos;m a caregiver — switch back
        </Link>
      )}
    </main>
  );
}
