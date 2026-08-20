"use client";

/**
 * Browser speech helpers for the session runner's "Read instructions aloud"
 * feature (owner spec). Web Speech API only — no external TTS service, nothing
 * leaves the device. All functions are safe to call when speechSynthesis is
 * unavailable (they just do nothing).
 */

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** prefers-reduced-motion ⇒ never auto-play; the replay button still works. */
export function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Map the stored primary-language free text to a BCP-47 tag, falling back to
 *  English gracefully when the browser has no matching voice. */
export function pickLang(primaryLanguage?: string | null): string {
  const wanted = (primaryLanguage ?? "").trim().toLowerCase();
  const table: Record<string, string> = {
    english: "en-GB",
    yoruba: "yo",
    igbo: "ig",
    hausa: "ha",
    french: "fr",
    spanish: "es",
    portuguese: "pt",
    arabic: "ar",
  };
  const requested = table[wanted] ?? "en";
  if (!speechAvailable()) return requested;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return requested; // voice list not loaded yet — let the browser decide
  const prefix = requested.split("-")[0];
  return voices.some((v) => v.lang.toLowerCase().startsWith(prefix)) ? requested : "en";
}

/** Speak `text`, cancelling any in-progress utterance first. */
export function speak(text: string, lang: string): void {
  if (!speechAvailable() || !text.trim()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function cancelSpeech(): void {
  if (speechAvailable()) window.speechSynthesis.cancel();
}
