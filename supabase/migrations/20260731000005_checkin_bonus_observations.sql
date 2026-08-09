-- ============================================================================
-- Verbly — per-trial bonus observations on session_checkins
-- ============================================================================
-- The curriculum's Scoring Appendix (§3 Bonus Mechanisms) layers additive,
-- per-trial bonuses on top of the base credit for three phases:
--   • PECS Phase 4 (Sentence Structure)  — Attribute Expansion
--   • PECS Phase 6 (Commenting)          — Correct Stem Selection
--   • Phase 12 (Vocal Approximation)     — Closer Approximation
--
-- A check-in stays a fact-record (a direct client insert). It now carries the
-- BASE credit in `credit_value` (unchanged) PLUS the raw observation needed to
-- compute the bonus. The final per-trial credit (base + bonus, with caps/
-- floors, and Phase 12's history-dependent rolling baseline) is computed
-- SERVER-SIDE in /sessions/complete — never by the client — so scoring stays
-- server-authoritative. See lib/engine/scoring.ts.
--
-- Nullable: only the three bonus phases populate these; every other phase
-- leaves them null and is scored on `credit_value` alone.
-- ============================================================================

alter table public.session_checkins
  add column bonus_kind text
    check (bonus_kind in ('attribute', 'stem', 'approximation')),
  add column bonus_observation jsonb;

comment on column public.session_checkins.bonus_kind is
  'Which Scoring-Appendix §3 bonus applies to this trial, if any: attribute (PECS 4), stem (PECS 6), approximation (Phase 12). Null for all other phases.';
comment on column public.session_checkins.bonus_observation is
  'Raw per-trial observation for the bonus, e.g. {"added":true} (attribute); {"stem":"I hear","correct":true} (stem); {"target":"ball","step":3} (approximation). Interpreted server-side at scoring time.';
