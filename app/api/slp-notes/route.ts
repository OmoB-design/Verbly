import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/slp-notes  { child_id, body, session_instance_id?, assessment_id? }
 *
 * An SLP leaves a note on a linked child's record. Append-only and ALWAYS
 * caregiver-visible (owner ruling 2026-08-11 — no hidden records about a child
 * their caregiver can't see); the shared note IS the SLP→caregiver channel.
 * Inserted through the SLP's own session so the RLS with-check proves the link
 * at write time — revoked SLPs are refused by the database, not by us.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let body: { child_id?: string; body?: string; session_instance_id?: string; assessment_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const text = (body.body ?? "").trim();
  if (!body.child_id || !text) {
    return NextResponse.json({ error: "child_id and a non-empty note body are required" }, { status: 400 });
  }
  if (text.length > 4000) {
    return NextResponse.json({ error: "Notes are capped at 4000 characters" }, { status: 400 });
  }

  const { data: note, error: insErr } = await supabase
    .from("slp_notes")
    .insert({
      slp_id: user.id,
      child_id: body.child_id,
      body: text,
      session_instance_id: body.session_instance_id || null,
      assessment_id: body.assessment_id || null,
    })
    .select("id, created_at")
    .single();
  if (insErr) {
    // RLS with-check failure = not linked (or link was revoked).
    const rls = insErr.code === "42501";
    return NextResponse.json(
      { error: rls ? "You're not linked to this child — ask the family for an invite." : insErr.message },
      { status: rls ? 403 : 500 },
    );
  }

  return NextResponse.json({ ok: true, id: note.id, created_at: note.created_at });
}
