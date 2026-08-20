"use client";

import Link from "next/link";
import { useActionState } from "react";

import { createChild } from "../actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function NewChildPage() {
  const [state, formAction, pending] = useActionState(createChild, undefined);

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Add a child</CardTitle>
          <CardDescription>This information is private to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Child&apos;s name</Label>
              <Input id="name" name="name" type="text" required className="h-11" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dob">Date of birth</Label>
              <Input id="dob" name="dob" type="date" required className="h-11" />
              <p className="text-xs text-muted-foreground">
                Used to choose age-appropriate activities. You can add it later.
              </p>
            </div>

            {state?.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={pending} className="h-11 px-6">
                {pending ? "Saving…" : "Save"}
              </Button>
              <Button asChild variant="outline" type="button" className="h-11 px-6">
                <Link href="/dashboard">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
