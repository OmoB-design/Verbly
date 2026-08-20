import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";

/**
 * Authenticated caregiver shell. Middleware already gates these routes; this
 * layout is the belt-and-braces guard and provides the shared header + the
 * always-visible clinical framing (a locked decision: kept in-app, not just at
 * onboarding).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Role-aware shell: SLP accounts get the caseload nav (RLS "select own"
  // makes this a cheap self-lookup).
  const { data: slp } = await supabase.from("slps").select("id").eq("id", user.id).maybeSingle();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader isSlp={!!slp} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t">
        <p className="mx-auto max-w-4xl px-4 py-4 text-xs text-muted-foreground">
          This isn&apos;t a diagnosis — it&apos;s a starting point.{" "}
          <a href="/settings" className="underline underline-offset-4 hover:text-foreground">
            Full details
          </a>
        </p>
      </footer>
    </div>
  );
}
