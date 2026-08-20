import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">That page isn&apos;t here</h1>
      <p className="text-muted-foreground text-sm">
        The link may be old, or the page may have moved. Nothing is lost — everything lives on your home page.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go home</Link>
      </Button>
    </main>
  );
}
