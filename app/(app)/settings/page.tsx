import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { CHILD_PROFILE_CAP } from "@/lib/limits";
import { CURRICULUM_VERSION, COMPASS_SCHEMA_VERSION } from "@/lib/compass/contract";
import { READINESS_SCHEMA_VERSION } from "@/content/readiness/readiness-checks";
import { PhaseChip } from "@/components/phase-identity";
import { DeleteAccountCard, DownloadDataButton } from "@/components/settings/account-controls";
import { updateFrequency } from "./actions";

const OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "daily", label: "Daily", hint: "A short note each day." },
  { value: "weekly", label: "Weekly", hint: "A gentle weekly check-in." },
  { value: "off", label: "Off", hint: "No emails — you're in charge of pace." },
];

/**
 * Account-level settings hub (owner spec 2026-08-14). Per-child settings
 * (profile, placement, helpers, SLP access) live on each child's settings
 * page — linked from here. Deliberately absent: push notifications (email
 * only — locked), security settings (Supabase Auth's job), admin/content
 * tools (separate internal surface, never in the caregiver app).
 */
export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: prefs }, { data: children }] = await Promise.all([
    supabase.from("notification_preferences").select("frequency").eq("caregiver_id", user.id).maybeSingle(),
    supabase.from("children").select("id, name, current_phase_id").order("created_at", { ascending: true }),
  ]);
  const current = prefs?.frequency ?? "weekly";

  const phaseIds = [...new Set((children ?? []).map((c) => c.current_phase_id).filter(Boolean))] as string[];
  const phaseNumById = new Map<string, number>();
  if (phaseIds.length > 0) {
    const { data: phases } = await supabase
      .schema("curriculum_content")
      .from("phases")
      .select("id, phase_number")
      .in("id", phaseIds);
    for (const p of phases ?? []) phaseNumById.set(p.id, p.phase_number);
  }

  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      {/* ── Children ─────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your children</CardTitle>
          <CardDescription>
            Each child has their own settings — profile details, starting phase, session helpers, and who can see
            their records.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(children ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">No children yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {(children ?? []).map((c) => {
                const n = c.current_phase_id ? phaseNumById.get(c.current_phase_id) : undefined;
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <span className="font-medium">{c.name}</span>
                      {n !== undefined ? <PhaseChip phase={n} /> : null}
                    </span>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/children/${c.id}/edit`}>Child settings</Link>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
          {(children ?? []).length < CHILD_PROFILE_CAP ? (
            <div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/children/new">+ Add a child</Link>
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">
              Profile limit reached ({CHILD_PROFILE_CAP} children per account).
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Email reminders (existing) ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email reminders</CardTitle>
          <CardDescription>
            How often should Verbly email you? Reminders, encouragement, milestones, and reassessment check-ins all
            follow this setting — never more than you choose. Email is the only channel Verbly uses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateFrequency} className="flex flex-col gap-4">
            <fieldset className="flex flex-col gap-3">
              <legend className="sr-only">Email frequency</legend>
              {OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`freq-${opt.value}`}
                  className="has-[:checked]:border-primary has-[:checked]:bg-accent/40 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3"
                >
                  <input
                    id={`freq-${opt.value}`}
                    type="radio"
                    name="frequency"
                    value={opt.value}
                    defaultChecked={current === opt.value}
                    className="mt-0.5 size-4"
                  />
                  <span className="text-sm">
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground block">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div>
              <Button type="submit" className="h-11 px-6">
                Save
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* ── Data & privacy ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your data & privacy</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm">
          <div className="text-muted-foreground flex flex-col gap-2">
            <p>
              <span className="text-foreground font-medium">What Verbly stores:</span> your children&apos;s profiles,
              Communication Compass answers and results, practice-session records, sounds you&apos;ve captured
              (including any short recordings you chose to make), and notes from professionals you&apos;ve invited.
            </p>
            <p>
              <span className="text-foreground font-medium">Who can see it:</span> you — and, per child, only the
              professionals you&apos;ve explicitly invited (read-only, revocable any time from that child&apos;s
              settings). Access is enforced by the database itself, not just the app. Recordings are never publicly
              accessible.
            </p>
            <p>
              You can download everything below in a readable format, and delete everything under Account.
            </p>
          </div>
          <DownloadDataButton />
        </CardContent>
      </Card>

      {/* ── Account ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
          <CardDescription>
            Signed in as <span className="text-foreground font-medium">{user.email}</span> — this address receives all
            Verbly emails.
          </CardDescription>
        </CardHeader>
      </Card>

      <DeleteAccountCard email={user.email ?? ""} />

      {/* ── About ────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About Verbly</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground flex flex-col gap-2 text-sm">
          <p>
            The Communication Compass and Verbly&apos;s activities are a{" "}
            <span className="text-foreground font-medium">
              screening and home-practice tool, not a validated clinical instrument
            </span>{" "}
            — results are a starting point for personalized practice, never a diagnosis, and never a substitute for
            professional evaluation by a speech-language pathologist.
          </p>
          <p className="text-xs">
            App version 0.1.0 · Curriculum {CURRICULUM_VERSION} · Compass {COMPASS_SCHEMA_VERSION} · Readiness{" "}
            {READINESS_SCHEMA_VERSION}
          </p>
          {contactEmail ? (
            <p className="text-xs">
              Questions or feedback:{" "}
              <a href={`mailto:${contactEmail}`} className="text-primary underline-offset-4 hover:underline">
                {contactEmail}
              </a>
            </p>
          ) : (
            <p className="text-xs">Questions or feedback: contact your research coordinator.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
