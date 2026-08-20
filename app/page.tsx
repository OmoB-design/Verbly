import Link from "next/link";
import { Compass, Home as HomeIcon, Sprout } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PhaseArt } from "@/components/phase-identity";

/** Public landing: warm, honest, two actions. The Phase 1 artwork (shared
 *  attention between caregiver and child) IS the product in one picture. */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 px-6 py-16">
      <div className="flex flex-col gap-4">
        <p className="text-primary text-lg font-semibold tracking-tight">Verbly</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Speech practice that fits your family
        </h1>
        <p className="text-muted-foreground max-w-prose">
          Warm, guided activities you run at home with your child — matched to where they are today, a few minutes at
          a time.
        </p>
      </div>

      <PhaseArt phase={1} priority />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/signup">Create your account</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/login">Log in</Link>
        </Button>
      </div>

      <ul className="grid gap-4 sm:grid-cols-3">
        <li className="flex flex-col gap-1.5">
          <Compass className="text-primary size-5" aria-hidden />
          <p className="text-sm font-medium">A personalised start</p>
          <p className="text-muted-foreground text-sm">
            Ten minutes of questions finds the right first activities — no guesswork.
          </p>
        </li>
        <li className="flex flex-col gap-1.5">
          <HomeIcon className="text-primary size-5" aria-hidden />
          <p className="text-sm font-medium">Guided sessions at home</p>
          <p className="text-muted-foreground text-sm">
            Step-by-step activities with gentle check-ins — you play, Verbly keeps track.
          </p>
        </li>
        <li className="flex flex-col gap-1.5">
          <Sprout className="text-primary size-5" aria-hidden />
          <p className="text-sm font-medium">Progress you can share</p>
          <p className="text-muted-foreground text-sm">
            Growth over time, ready to share with your speech-language pathologist.
          </p>
        </li>
      </ul>

      <p className="text-muted-foreground text-xs">
        This isn&apos;t a diagnosis — it&apos;s a starting point. Verbly is not a substitute for professional
        evaluation by a speech-language pathologist.
      </p>
    </main>
  );
}
