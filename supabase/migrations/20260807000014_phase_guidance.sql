-- ============================================================================
-- Verbly — phase-level caregiver guidance (F6 ruling, 2026-08-07)
-- ============================================================================
-- The curriculum's per-phase "Progress Indicators — What the Caregiver Should
-- Look For" and "Important Therapy Tips" are caregiver-facing display content
-- that belongs WITH the phase: a simple text/markdown blob on the phase record.
-- Not structured, not scored, not session-level, and never consumed by the RL
-- engine — shown on the phase overview the caregiver sees when they first land
-- on a new phase.
-- ============================================================================

alter table curriculum_content.phases
  add column phase_guidance text;

comment on column curriculum_content.phases.phase_guidance is
  'Caregiver-facing phase guidance (Progress Indicators + Therapy Tips), markdown/plain text. Display-only: never read by the RL engine or scoring.';
