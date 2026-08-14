-- ============================================================================
-- Verbly — settings surface (owner spec 2026-08-14)
-- ============================================================================
-- Two data gaps behind the settings build:
--
--   • children.primary_language / additional_languages — set at onboarding in
--     spirit, but never captured anywhere. Plain text (free entry) — language
--     is descriptive context for the SLP, not an enum the engine branches on.
--
--   • saved_participants — the caregiver's reusable roster of session helpers
--     (Communication Partner / Physical Prompter for Phases 4–5 / peers for
--     Phase 10) so names aren't retyped every session. Display names only,
--     never accounts (locked decision: helpers are unauthenticated). Distinct
--     from session_participants, which remains the immutable per-session log
--     of who was actually present.

alter table public.children
  add column primary_language text,
  add column additional_languages text;

comment on column public.children.primary_language is
  'Main language used with the child at home (free text — descriptive context, not engine input).';
comment on column public.children.additional_languages is
  'Other languages the child hears regularly (free text).';

create table public.saved_participants (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.children (id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) > 0),
  role         text not null check (role in ('communication_partner', 'physical_prompter', 'peer')),
  created_at   timestamptz not null default now()
);

create index saved_participants_child_id_idx on public.saved_participants (child_id);

alter table public.saved_participants enable row level security;
-- The caregiver manages their own child's roster end-to-end; linked SLPs can
-- see it (context for session records). No writes for SLPs.
create policy "saved_participants select for caregiver or linked slp"
  on public.saved_participants for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );
create policy "saved_participants insert by caregiver"
  on public.saved_participants for insert
  to authenticated
  with check (public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id)));
create policy "saved_participants update by caregiver"
  on public.saved_participants for update
  to authenticated
  using (public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id)))
  with check (public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id)));
create policy "saved_participants delete by caregiver"
  on public.saved_participants for delete
  to authenticated
  using (public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id)));
