-- ============================================================================
-- Verbly — in-session vocalization capture
-- ============================================================================
-- The curriculum asks caregivers to document vocalizations as they happen
-- (which sound, in what context, spontaneous or imitated) — especially through
-- Phases 9–12. The original table was audio-first (storage_path NOT NULL), but
-- mid-activity a caregiver will often only manage the quick facts; audio is a
-- bonus, not the record. Three changes:
--
--   • storage_path becomes NULLABLE — a text-only log is a valid record. The
--     "never a public URL" rule for audio is unchanged.
--   • sound_produced — what was heard, as the caregiver types it ("ba", "mmm").
--     (target_sound remains: the sound being WORKED ON, when known.)
--   • spontaneity — 'spontaneous' (unprompted) or 'imitated' (after a model),
--     the curriculum's key clinical distinction for these logs.
-- ============================================================================

alter table public.vocalization_logs
  alter column storage_path drop not null;

alter table public.vocalization_logs
  add column sound_produced text,
  add column spontaneity text check (spontaneity in ('spontaneous', 'imitated'));

comment on column public.vocalization_logs.storage_path is
  'Supabase Storage object path for the audio clip (private bucket, signed-URL access only). Null for text-only logs captured without a recording.';
comment on column public.vocalization_logs.sound_produced is
  'The sound/word the caregiver heard, as they typed it (e.g. ''ba'', ''mmm'', ''wa-wa'').';
comment on column public.vocalization_logs.spontaneity is
  'Whether the vocalization was spontaneous (unprompted) or imitated (after an adult model) — the curriculum''s key distinction for vocalization documentation.';
