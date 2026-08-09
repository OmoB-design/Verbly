-- ============================================================================
-- Verbly — fix account-deletion cascade (ran_by_caregiver_id FK)
-- ============================================================================
-- Found by an e2e test: deleting an auth user (→ caregivers cascade → children
-- cascade → session_instances cascade) can FAIL once session_instances rows
-- exist, because session_instances.ran_by_caregiver_id references caregivers
-- with NO ACTION — and Postgres may run that RI check before the child-side
-- cascade has removed the instances.
--
-- In the current single-logged-in-caregiver model the running caregiver IS the
-- account owner, so an instance always dies with its child/account anyway —
-- the ran_by FK must not be an independent blocker of account deletion.
-- ============================================================================

alter table public.session_instances
  drop constraint session_instances_ran_by_caregiver_id_fkey;

alter table public.session_instances
  add constraint session_instances_ran_by_caregiver_id_fkey
    foreign key (ran_by_caregiver_id) references public.caregivers (id) on delete cascade;
