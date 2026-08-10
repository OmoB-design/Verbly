import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Top nav for both roles. Sign-out posts to the existing /auth/signout route.
 *  SLPs get their caseload as home; caregiver settings are hidden for them. */
export function AppHeader({ isSlp = false }: { isSlp?: boolean }) {
  const home = isSlp ? "/slp" : "/dashboard";
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <Link href={home} className="text-lg font-semibold tracking-tight">
          Verbly
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Button asChild variant="ghost" className="h-11">
            <Link href={home}>{isSlp ? "Caseload" : "Home"}</Link>
          </Button>
          {!isSlp ? (
            <Button asChild variant="ghost" className="h-11">
              <Link href="/settings">Settings</Link>
            </Button>
          ) : null}
          <form action="/auth/signout" method="post">
            <Button variant="ghost" type="submit" className="h-11">
              Log out
            </Button>
          </form>
        </nav>
      </div>
    </header>
  );
}
