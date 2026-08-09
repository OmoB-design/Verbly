import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-8 px-6 py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight">Verbly</h1>
        <p className="text-muted-foreground">
          Adaptive, caregiver-delivered speech and language intervention for
          children with speech delays.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Button asChild>
          <Link href="/signup">Create a caregiver account</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Verbly is a screening and home-practice tool. It is{" "}
        <strong>not a substitute for professional evaluation</strong> by a
        speech-language pathologist.
      </p>
    </main>
  );
}
