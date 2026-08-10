"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

/**
 * Quick in-session vocalization capture. The curriculum asks caregivers to
 * document sounds as they happen — which sound, spontaneous or imitated — with
 * an optional short audio clip. Metadata is the record; audio is a bonus (and
 * the private-bucket / signed-URL rule applies server-side). Deliberately
 * lightweight: expandable, two taps + a word, never blocks the check-in loop.
 */

const MAX_RECORD_SECONDS = 10;

export function SoundCapture({
  childId,
  childName,
  sessionInstanceId,
}: {
  childId: string;
  childName: string;
  sessionInstanceId: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [sound, setSound] = React.useState("");
  const [spontaneity, setSpontaneity] = React.useState<"spontaneous" | "imitated" | undefined>();
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [recording, setRecording] = React.useState(false);
  const [micError, setMicError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [savedCount, setSavedCount] = React.useState(0);

  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const stopTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanupRecorder = React.useCallback(() => {
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    recorderRef.current = null;
  }, []);

  React.useEffect(() => () => cleanupRecorder(), [cleanupRecorder]);

  async function toggleRecord() {
    setMicError(null);
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        setAudioBlob(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());
        if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
        stopTimerRef.current = null;
        recorderRef.current = null;
      };
      recorderRef.current = rec;
      rec.start();
      setAudioBlob(null);
      setRecording(true);
      stopTimerRef.current = setTimeout(() => rec.state !== "inactive" && rec.stop(), MAX_RECORD_SECONDS * 1000);
    } catch {
      setMicError("Couldn't access the microphone — the note still saves without audio.");
    }
  }

  async function save() {
    if (!sound.trim() || !spontaneity) return;
    setSaving(true);
    setSaveError(null);
    try {
      const form = new FormData();
      form.set("child_id", childId);
      form.set("session_instance_id", sessionInstanceId);
      form.set("sound_produced", sound.trim());
      form.set("spontaneity", spontaneity);
      if (audioBlob) form.set("audio", audioBlob, "clip");
      const res = await fetch("/api/vocalization-logs", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error ?? "That didn't save — try again.");
        return;
      }
      setSavedCount((n) => n + 1);
      setSound("");
      setSpontaneity(undefined);
      setAudioBlob(null);
      setOpen(false);
    } catch {
      setSaveError("That didn't save — try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        ♪ {childName} made a sound{savedCount > 0 ? ` (${savedCount} captured)` : ""}
      </button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Capture a sound</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="sound-heard" className="text-sm text-muted-foreground">
            What did you hear?
          </label>
          <Input
            id="sound-heard"
            value={sound}
            onChange={(e) => setSound(e.target.value)}
            placeholder="e.g. ba, mmm, wa-wa"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            aria-pressed={spontaneity === "spontaneous"}
            onClick={() => setSpontaneity("spontaneous")}
            className={
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
              (spontaneity === "spontaneous"
                ? "border-primary bg-primary/5 ring-primary/30 ring-1"
                : "border-input hover:bg-muted/50")
            }
          >
            On their own
          </button>
          <button
            type="button"
            aria-pressed={spontaneity === "imitated"}
            onClick={() => setSpontaneity("imitated")}
            className={
              "rounded-lg border px-3 py-2 text-left text-sm transition-colors " +
              (spontaneity === "imitated"
                ? "border-primary bg-primary/5 ring-primary/30 ring-1"
                : "border-input hover:bg-muted/50")
            }
          >
            Copying you
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={toggleRecord} disabled={saving}>
            {recording ? "Stop recording" : audioBlob ? "Re-record clip" : "Record a clip (optional)"}
          </Button>
          {recording ? <span className="text-xs text-muted-foreground">recording… up to {MAX_RECORD_SECONDS}s</span> : null}
          {!recording && audioBlob ? <span className="text-xs text-muted-foreground">clip ready ✓</span> : null}
        </div>
        {micError ? <p className="text-xs text-muted-foreground">{micError}</p> : null}
        {saveError ? <p className="text-sm text-destructive">{saveError}</p> : null}

        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || recording || !sound.trim() || !spontaneity}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
