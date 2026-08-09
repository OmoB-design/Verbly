-- ============================================================================
-- Verbly — retire curriculum_content.age_bands (age-scheme unification, part 2)
-- ============================================================================
-- Blueprint v2.1.0 §13.3 (the authoritative Curriculum Alignment Contract)
-- establishes ONE age scheme — the varchar bracket '3-7' | '8-12' | '10-14' —
-- that drives BOTH the Compass item set AND the curriculum activity variant.
-- Migration 009 already moved the child- and history-side tracking onto that
-- varchar bracket. This finishes the job on the CONTENT side: sessions are keyed
-- by `age_bracket` instead of a uuid FK into a separate `age_bands` table, and
-- the `age_bands` table is dropped.
--
-- This SUPERSEDES the earlier "one canonical age-band TABLE" decision (owner
-- sign-off 2026-08-07): the single canonical scheme is now the versioned
-- AGE_BRACKETS constant (lib/compass/contract.ts) + this CHECK, not a table. The
-- intent is unchanged — one scheme, no ad-hoc per-phase ranges. DATABASE.md and
-- the CLAUDE.md locked-decisions row are updated to match.
--
-- Zero-data migration: curriculum_content.age_bands and .sessions are both empty
-- (verified). The bracket values mirror §13.3 / children.age_bracket (008) /
-- session_instances.age_bracket (009).
-- ============================================================================

-- 1. Re-key the session identity uniqueness off the varchar bracket.
alter table curriculum_content.sessions
  drop constraint session_identity_unique;

alter table curriculum_content.sessions
  add column age_bracket text check (age_bracket in ('3-7', '8-12', '10-14'));

alter table curriculum_content.sessions
  add constraint session_identity_unique
    unique (phase_id, session_number, age_bracket, content_version);

-- 2. Drop the old uuid FK column (its index + FK go with it) and re-add the index.
alter table curriculum_content.sessions
  drop column age_band_id;

create index sessions_age_bracket_idx on curriculum_content.sessions (age_bracket);

comment on column curriculum_content.sessions.age_bracket is
  'The age bracket this session variant is written for (§13.3 ''3-7''|''8-12''|''10-14''). Null = applies regardless of bracket (not age-variant). The MEANING of a variance (content-only vs. also a fading-target change) lives in this session''s content_json, not in a separate table.';

-- 3. Drop the now-orphaned age_bands table. Its RLS policy drops with it. No
--    session references it any more, and the RL runtime stopped reading it in 009.
drop table curriculum_content.age_bands;
