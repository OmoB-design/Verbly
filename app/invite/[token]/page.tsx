import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AcceptInviteButton } from "@/components/slp/accept-invite-button";

/**
 * Public invite landing (an SLP may arrive with no account). Shows exactly
 * what's being granted before anything happens; the actual link is written by
 * POST /api/slp-links/accept, which re-validates everything server-side.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("slp_invites")
    .select("id, token, child_id, expires_at, redeemed_at, revoked_at")
    .eq("token", token)
    .maybeSingle();

  const shell = (title: string, body: React.ReactNode) => (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">{body}</CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Verbly is a screening and home-practice tool, not a substitute for professional evaluation.
      </p>
    </main>
  );

  const invalid =
    !invite ||
    invite.revoked_at ||
    invite.redeemed_at ||
    new Date(invite.expires_at).getTime() < Date.now();
  if (invalid) {
    return shell(
      "This invite link isn't active",
      <>
        <p className="text-sm text-muted-foreground">
          It may have expired, been used already, or been withdrawn by the family. Ask them for a fresh link — invites
          are easy to re-create.
        </p>
        <div>
          <Button asChild variant="outline">
            <Link href="/login">Go to Verbly</Link>
          </Button>
        </div>
      </>,
    );
  }

  const { data: child } = await admin.from("children").select("name").eq("id", invite.child_id).maybeSingle();
  const childName = child?.name ?? "a child";

  // Who's looking at it?
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: slp } = user
    ? await admin.from("slps").select("id").eq("id", user.id).maybeSingle()
    : { data: null };

  const grantSummary = (
    <p className="text-sm text-muted-foreground">
      A family is inviting you, as their speech-language pathologist, to view{" "}
      <span className="font-medium text-foreground">{childName}</span>&apos;s Verbly records — assessment results,
      session history, and progress — <span className="font-medium text-foreground">read-only</span>, plus the ability
      to leave notes the family can always see. The family can withdraw access at any time.
    </p>
  );

  const next = `/invite/${token}`;

  if (!user) {
    return shell(
      `An invitation about ${childName}`,
      <>
        {grantSummary}
        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href={`/signup?type=slp&next=${encodeURIComponent(next)}`}>Create an SLP account</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/login?next=${encodeURIComponent(next)}`}>I already have an account</Link>
          </Button>
        </div>
      </>,
    );
  }

  if (!slp) {
    return shell(
      "This invite is for an SLP account",
      <>
        <p className="text-sm text-muted-foreground">
          You&apos;re signed in to a caregiver account. This link grants professional access and can only be accepted
          by a speech-language pathologist account. If you&apos;re the SLP, log out and create an SLP account with this
          link.
        </p>
        <div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Verbly</Link>
          </Button>
        </div>
      </>,
    );
  }

  return shell(
    `An invitation about ${childName}`,
    <>
      {grantSummary}
      <AcceptInviteButton token={token} childName={childName} />
    </>,
  );
}
