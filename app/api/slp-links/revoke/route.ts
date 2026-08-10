import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/slp-links/revoke  { child_id, slp_id? , invite_id? }
 *
 * The caregiver's access-control lever: deleting the slp_child_links row cuts
 * the SLP's read access instantly (every SLP policy resolves through it), and
 * revoking a pending invite kills the token. Existing notes remain part of the
 * child's record (append-only). RLS authorizes child ownership; writes go
 * through the service role.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { child_id?: string; slp_id?: string; invite_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.child_id) return NextResponse.json({ error: "child_id is required" }, { status: 400 });
  if (!body.slp_id && !body.invite_id) {
    return NextResponse.json({ error: "Provide slp_id (unlink) or invite_id (withdraw invite)" }, { status: 400 });
  }

  // Authorize via RLS — only the child's caregiver may revoke.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("id")
    .eq("id", body.child_id)
    .maybeSingle();
  if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });
  if (!child) return NextResponse.json({ error: "Child not found or not accessible" }, { status: 403 });

  const admin = createAdminClient();

  if (body.slp_id) {
    const { error } = await admin
      .from("slp_child_links")
      .delete()
      .eq("child_id", child.id)
      .eq("slp_id", body.slp_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (body.invite_id) {
    const { error } = await admin
      .from("slp_invites")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", body.invite_id)
      .eq("child_id", child.id)
      .is("redeemed_at", null);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
