-- §13.5 validation instrumentation: every Age-Bracket Transition evaluation's
-- gate outcomes are recorded, so the built-in threshold-validation trigger
-- ("revisit thresholds if none of the first 50 children clear all 3 gates")
-- can actually be computed from data instead of anecdote.
alter table public.session_instances
  add column age_gate_evaluation jsonb;

comment on column public.session_instances.age_gate_evaluation is
  'Age-Bracket Transition Rule evaluation at this session''s completion, when one ran: { gates: {g1Mean,g2TopTier,g3NoRetakes}, transitioned, blockedByCooldown, blockedByAgeFloor, windowSize }. Null when no evaluation applied (graduating session, no bracket, terminal bracket). Feeds the §13.5 threshold-validation trigger.';
