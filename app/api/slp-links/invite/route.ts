import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/slp-links/invite  { child_id }
 *
 * Caregiver-initiated SLP invite: mints a single-use, 14-day token the
 * caregiver shares however they like (the link works without email — Resend
 * has no domain yet). RLS authorizes the caregiver; the row is written with
 * the service role (no user write policies on slp_invites).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { child_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!body.child_id) return NextResponse.json({ error: "child_id is required" }, { status: 400 });

  // Authorize via RLS — only the child's caregiver gets a row back.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("id, name")
    .eq("id", body.child_id)
    .maybeSingle();
  if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });
  if (!child) return NextResponse.json({ error: "Child not found or not accessible" }, { status: 403 });

  const admin = createAdminClient();
  const { data: invite, error: insErr } = await admin
    .from("slp_invites")
    .insert({ child_id: child.id, created_by: user.id })
    .select("id, token, expires_at")
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  return NextResponse.json({
    invite_id: invite.id,
    url: `${base}/invite/${invite.token}`,
    expires_at: invite.expires_at,
  });
}
