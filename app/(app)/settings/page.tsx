import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { updateFrequency } from "./actions";

const OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "daily", label: "Daily", hint: "A short note each day." },
  { value: "weekly", label: "Weekly", hint: "A gentle weekly check-in." },
  { value: "off", label: "Off", hint: "No emails — you're in charge of pace." },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("frequency")
    .eq("caregiver_id", user.id)
    .maybeSingle();
  const current = prefs?.frequency ?? "weekly";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email reminders</CardTitle>
          <CardDescription>
            How often should Verbly email you? Reminders, encouragement, and milestones all follow
            this setting — never more than you choose.
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
                  className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border p-3 has-[:checked]:border-primary has-[:checked]:bg-accent/40"
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
                    <span className="block text-muted-foreground">{opt.hint}</span>
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
    </div>
  );
}
