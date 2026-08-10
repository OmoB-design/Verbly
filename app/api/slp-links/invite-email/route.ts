import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

/**
 * POST /api/slp-links/invite-email  { invite_id, email }
 *
 * Emails an existing invite link to the SLP. DRY-RUN until the Resend domain
 * is verified (the response says so honestly and the UI tells the caregiver to
 * copy the link instead) — the moment NOTIFICATIONS_FROM exists this starts
 * sending with no code change.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { invite_id?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const email = (body.email ?? "").trim();
  if (!body.invite_id || !email.includes("@")) {
    return NextResponse.json({ error: "invite_id and a valid email are required" }, { status: 400 });
  }

  // RLS: the caregiver can only see invites for their own child.
  const { data: invite, error: invErr } = await supabase
    .from("slp_invites")
    .select("id, token, child_id, expires_at, redeemed_at, revoked_at")
    .eq("id", body.invite_id)
    .maybeSingle();
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });
  if (!invite) return NextResponse.json({ error: "Invite not found or not accessible" }, { status: 403 });
  if (invite.redeemed_at || invite.revoked_at) {
    return NextResponse.json({ error: "This invite is no longer active" }, { status: 410 });
  }

  const admin = createAdminClient();
  const { data: child } = await admin.from("children").select("name").eq("id", invite.child_id).maybeSingle();
  const childName = child?.name ?? "a child";

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const link = `${base}/invite/${invite.token}`;

  const result = await sendEmail({
    to: email,
    subject: `You've been invited to view ${childName}'s Verbly records`,
    body:
      `Hello,\n\nA family using Verbly has invited you, as their speech-language pathologist, ` +
      `to view ${childName}'s records — assessment results, session history, and progress notes (read-only, ` +
      `with the ability to leave notes the family can see).\n\nAccept the invitation here:\n${link}\n\n` +
      `The link expires on ${new Date(invite.expires_at).toDateString()}. If you weren't expecting this, you can ignore it.\n\n` +
      `Verbly is a screening and home-practice tool, not a substitute for professional evaluation.\n`,
  });
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Could not send" }, { status: 502 });

  return NextResponse.json({ ok: true, dry_run: result.dryRun });
}
