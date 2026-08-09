-- ============================================================================
-- Verbly — age-group variant tracking
-- ============================================================================
-- The Age-Bracket Transition Rule moves a child UP one age-group variant when
-- performance shows the current framing has become too young. Two pieces of
-- state were missing to run that rule and record it:
--
--   • children.current_age_band_id — which age-group variant the child is
--     currently presented. Set at onboarding from chronological age; updated
--     by the transition. Nullable: phases with no age variants leave it null.
--
--   • phase_history.age_band_id — lets an `age_bracket_transition` row record
--     WHICH variant the child moved to, keeping the single-audit-trail
--     principle intact (one table for every transition kind). Nullable: only
--     age-bracket transitions populate it.
-- ============================================================================

alter table public.children
  add column current_age_band_id uuid references curriculum_content.age_bands (id);

alter table public.phase_history
  add column age_band_id uuid references curriculum_content.age_bands (id);

comment on column public.children.current_age_band_id is
  'The age-group variant currently presented to this child (curriculum_content.age_bands). Null for phases without age variants. Updated by the Age-Bracket Transition Rule.';
comment on column public.phase_history.age_band_id is
  'For trigger_reason = age_bracket_transition rows: which age-group variant the child moved to. Null for all other transition kinds.';
