-- Voice instructions (owner spec): "Read instructions aloud" in the session
-- runner, via the browser's speechSynthesis — no external TTS. The preference
-- lives with the other user settings so it survives navigation and sessions.
alter table public.notification_preferences
  add column voice_enabled boolean not null default false;

comment on column public.notification_preferences.voice_enabled is
  'Session runner reads activity instructions and check-in prompts aloud (Web Speech API, browser-local). Off by default.';
