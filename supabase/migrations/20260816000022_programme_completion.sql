-- Programme completion: a child graduating Phase 12 previously just... stayed
-- put, silently. The completion is a child-state fact (no phase transition
-- occurs, so no phase_history row) recorded once, surfaced by the picker, the
-- session-complete celebration, and the child page.
alter table public.children
  add column programme_completed_at timestamptz;

comment on column public.children.programme_completed_at is
  'Set once when the child passes the graduation criterion on the final phase (12). Sessions stay available to revisit; the advancement engine simply has nowhere further to go.';
