"use client";

import * as React from "react";

/**
 * On-demand playback for a vocalization clip. The signed URL is minted only
 * when the SLP asks to listen (short-lived, never stored) via the existing
 * RLS-scoped audio-url route — the locked "no permanent public URL" rule.
 */
export function VocalPlayback({ logId }: { logId: string }) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/vocalization-logs/${logId}/audio-url`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't load the clip.");
        return;
      }
      setUrl(data.url);
    } catch {
      setError("Couldn't load the clip.");
    } finally {
      setBusy(false);
    }
  }

  if (url) {
    return <audio controls autoPlay src={url} className="h-8 max-w-48" />;
  }
  return (
    <span className="flex items-center gap-2">
      <button
        type="button"
        onClick={load}
        disabled={busy}
        className="text-xs text-primary underline underline-offset-4 hover:opacity-80 disabled:opacity-50"
      >
        {busy ? "Loading…" : "▶ Listen"}
      </button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </span>
  );
}
