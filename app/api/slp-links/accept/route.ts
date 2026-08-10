import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/slp-links/accept  { token }
 *
 * An SLP redeems a caregiver's invite: validates the token (exists, unexpired,
 * unredeemed, unrevoked), requires the caller to hold an SLP account, then
 * writes the slp_child_links row — the single fact all SLP read access (RLS)
 * hangs off. Idempotent for an already-linked pair.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { token?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  const admin = createAdminClient();

  // The caller must be an SLP (accounts are typed at signup).
  const { data: slp } = await admin.from("slps").select("id").eq("id", user.id).maybeSingle();
  if (!slp) {
    return NextResponse.json(
      { error: "This invite is for a speech-language pathologist account.", code: "not_an_slp" },
      { status: 403 },
    );
  }

  const { data: invite, error: invErr } = await admin
    .from("slp_invites")
    .select("id, child_id, expires_at, redeemed_at, revoked_at")
    .eq("token", body.token)
    .maybeSingle();
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 });
  if (!invite) return NextResponse.json({ error: "This invite link isn't valid." }, { status: 404 });
  if (invite.revoked_at) return NextResponse.json({ error: "This invite has been withdrawn." }, { status: 410 });
  if (invite.redeemed_at) return NextResponse.json({ error: "This invite has already been used." }, { status: 410 });
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invite has expired — ask the family for a fresh link." }, { status: 410 });
  }

  // Link (idempotent on the unique pair), then mark the invite redeemed.
  const { error: linkErr } = await admin
    .from("slp_child_links")
    .upsert(
      { slp_id: user.id, child_id: invite.child_id, linked_by: "caregiver_invite" },
      { onConflict: "slp_id,child_id", ignoreDuplicates: true },
    );
  if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });

  await admin
    .from("slp_invites")
    .update({ redeemed_by: user.id, redeemed_at: new Date().toISOString() })
    .eq("id", invite.id);

  return NextResponse.json({ ok: true, child_id: invite.child_id });
}
