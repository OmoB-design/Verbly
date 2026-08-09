-- ============================================================================
-- Verbly — Communication Compass save-and-resume (§11)
-- ============================================================================
-- Caregivers of young children rarely finish the assessment in one sitting, so
-- the flow persists partial answers and can be resumed later (a resume link is
-- also delivered by email). The in-progress answers live in a single jsonb blob
-- on the assessment row:
--
--   • draft_state — the wizard's working state (responses, benchmark answers,
--     red-flag answers, second-adult, concern, and the current step index).
--     Written while status = 'in_progress'; ignored once the assessment is
--     scored (the final §8 result lives in raw_payload, not here).
--
-- /api/compass/start reuses the child's existing in_progress row instead of
-- creating a new one, so revisiting resumes rather than spawning duplicates.
-- ============================================================================

alter table public.assessments
  add column draft_state jsonb;

comment on column public.assessments.draft_state is
  'In-progress caregiver answers for save-and-resume (§11): { responses, benchmarkAnswers, redFlagAnswers, secondAdult, concernYes, concernText, idx }. Written while status = in_progress; irrelevant once scored (final result is raw_payload).';
