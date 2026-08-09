-- ============================================================================
-- Verbly — age-bracket unification (retire the age_bands FK scheme)
-- ============================================================================
-- Blueprint v2.1.0 §13.3 establishes ONE age scheme: the varchar age bracket
-- ('3-7' | '8-12' | '10-14') that drives BOTH the Compass item set and the
-- curriculum activity variant. Migration 008 added `children.age_bracket` for
-- Compass onboarding but deliberately left the older curriculum_content.age_bands
-- FK columns in place (children.current_age_band_id, phase_history.age_band_id),
-- and the RL Age-Bracket Transition Rule still read/wrote them — the "two age
-- fields" state the contract forbids for real onboarding.
--
-- This migration unifies onto the varchar bracket end-to-end:
--   • drop children.current_age_band_id (the uuid FK variant pointer);
--   • replace phase_history.age_band_id (uuid FK) with phase_history.age_bracket
--     (text) so an age_bracket_transition row records WHICH bracket, in the same
--     vocabulary as children.age_bracket;
--   • add session_instances.age_bracket (text), stamped at session start, so the
--     "last 3 sessions in the current variant" window is a plain column filter and
--     no longer needs the cross-schema sessions.age_band_id join.
--
-- All three retired/added columns are empty in the current dev database, so this
-- is a drop-and-rebuild with no data migration. The bracket CHECK mirrors
-- §13.3 / lib/compass/contract.ts (AGE_BRACKETS) and children.age_bracket (008).
-- ============================================================================

alter table public.children
  drop column if exists current_age_band_id;

alter table public.phase_history
  drop column if exists age_band_id;

alter table public.phase_history
  add column age_bracket text check (age_bracket in ('3-7', '8-12', '10-14'));

alter table public.session_instances
  add column age_bracket text check (age_bracket in ('3-7', '8-12', '10-14'));

comment on column public.phase_history.age_bracket is
  'For trigger_reason = age_bracket_transition rows: which age bracket the child moved to (§13.3 ''3-7''|''8-12''|''10-14''). Null for all other transition kinds.';
comment on column public.session_instances.age_bracket is
  'The child''s age bracket at the time this session ran, stamped at session start. Drives the activity variant and the Age-Bracket Transition Rule''s in-variant window. Null if the child had no bracket assigned when the session started.';
