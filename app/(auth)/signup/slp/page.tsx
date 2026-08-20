"use client";

import { Suspense } from "react";

import { SignupForm } from "@/components/auth/signup-form";

/** Dedicated SLP signup URL (shareable, linked from invites). */
export default function SlpSignupPage() {
  return (
    <Suspense>
      <SignupForm slp />
    </Suspense>
  );
}
