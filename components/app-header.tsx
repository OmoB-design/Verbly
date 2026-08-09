import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Caregiver-facing top nav. Sign-out posts to the existing /auth/signout route. */
export function AppHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
        <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
          Verbly
        </Link>
        <nav aria-label="Main" className="flex items-center gap-1">
          <Button asChild variant="ghost" className="h-11">
            <Link href="/dashboard">Home</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11">
            <Link href="/settings">Settings</Link>
          </Button>
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
