import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Private bucket for vocalization audio — objects are never public; playback
 *  goes through the signed-URL route. Must match audio-url/route.ts. */
const BUCKET = "vocalizations";
const MAX_AUDIO_BYTES = 5 * 1024 * 1024; // short clips only

/**
 * POST /api/vocalization-logs  (multipart/form-data)
 * Fields: child_id, sound_produced, spontaneity ('spontaneous'|'imitated'),
 *         session_instance_id?, target_sound?, audio? (short clip blob)
 *
 * Records a vocalization the caregiver observed mid-activity. The metadata is
 * the record (accessibility requirement — the log must stay useful without
 * playback); audio is an optional attachment, uploaded to the PRIVATE bucket
 * via the service role and only ever served back through signed URLs. The row
 * insert goes through the caller's own session so RLS (caregiver-of-child)
 * is enforced.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const childId = form.get("child_id");
  const soundProduced = form.get("sound_produced");
  const spontaneity = form.get("spontaneity");
  const sessionInstanceId = form.get("session_instance_id");
  const targetSound = form.get("target_sound");
  const audio = form.get("audio");

  if (typeof childId !== "string" || !childId) {
    return NextResponse.json({ error: "child_id is required" }, { status: 400 });
  }
  if (typeof soundProduced !== "string" || soundProduced.trim() === "") {
    return NextResponse.json({ error: "sound_produced is required — describe what you heard" }, { status: 400 });
  }
  if (spontaneity !== "spontaneous" && spontaneity !== "imitated") {
    return NextResponse.json({ error: "spontaneity must be 'spontaneous' or 'imitated'" }, { status: 400 });
  }

  // Authorize via RLS: the caller can only see their own child.
  const { data: child, error: childErr } = await supabase
    .from("children")
    .select("id")
    .eq("id", childId)
    .maybeSingle();
  if (childErr) return NextResponse.json({ error: childErr.message }, { status: 500 });
  if (!child) return NextResponse.json({ error: "Child not found or not accessible" }, { status: 403 });

  // Optional audio → private bucket (service role; storage has no user write policy).
  let storagePath: string | null = null;
  if (audio instanceof File && audio.size > 0) {
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "Audio clip too large — keep recordings short" }, { status: 413 });
    }
    const contentType = audio.type || "audio/webm";
    const ext = contentType.includes("mp4") ? "m4a" : contentType.includes("ogg") ? "ogg" : "webm";
    storagePath = `${childId}/${randomUUID()}.${ext}`;
    const admin = createAdminClient();
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(storagePath, Buffer.from(await audio.arrayBuffer()), { contentType });
    if (upErr) {
      // Metadata is still worth keeping — record without audio rather than fail.
      storagePath = null;
    }
  }

  const { data: row, error: insErr } = await supabase
    .from("vocalization_logs")
    .insert({
      child_id: childId,
      session_instance_id: typeof sessionInstanceId === "string" && sessionInstanceId ? sessionInstanceId : null,
      sound_produced: soundProduced.trim(),
      spontaneity,
      target_sound: typeof targetSound === "string" && targetSound.trim() ? targetSound.trim() : null,
      storage_path: storagePath,
    })
    .select("id")
    .single();
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: row.id, audio_saved: storagePath !== null });
}
