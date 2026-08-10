-- ============================================================================
-- Verbly — SLP surface (owner rulings 2026-08-11)
-- ============================================================================
-- The schema has carried SLP accounts + read-side RLS since migration 002;
-- this adds what was never built: the LINKING mechanism (caregiver-initiated
-- invite tokens), SLP notes (append-only, ALWAYS caregiver-visible — owner
-- ruling: no hidden records about a child their caregiver can't see), plus two
-- small persistence gaps the SLP view surfaces:
--   • assessments.concern_text — §7.1 promises free-text concerns are "routed
--     to human review"; until now only the boolean survived scoring.
--   • session_instances.downward_advisory — advisory evaluations were computed
--     at /sessions/complete and returned to the caller but never stored; the
--     SLP progression view (and §12 validation work) needs the history.

-- --------------------------------------------------------------------------
-- Invites: caregiver-initiated, per-child, single-use, expiring, revocable.
-- All writes go through server routes (service role) — no user write policies.
-- --------------------------------------------------------------------------
create table public.slp_invites (
  id          uuid primary key default gen_random_uuid(),
  token       uuid not null unique default gen_random_uuid(),
  child_id    uuid not null references public.children (id) on delete cascade,
  created_by  uuid not null references public.caregivers (id),
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  redeemed_by uuid references public.slps (id),
  redeemed_at timestamptz,
  revoked_at  timestamptz
);

create index slp_invites_child_id_idx on public.slp_invites (child_id);

alter table public.slp_invites enable row level security;
create policy "slp_invites select for the child's caregiver"
  on public.slp_invites for select
  to authenticated
  using (public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id)));

-- --------------------------------------------------------------------------
-- SLP notes: append-only (no update/delete policies — DB-enforced), optionally
-- anchored to a session or the assessment, ALWAYS visible to the caregiver.
-- A shared, timestamped note IS the SLP→caregiver channel (two-way chat is a
-- permanent cut). Inserted by the SLP through their own session so RLS proves
-- the link at write time.
-- --------------------------------------------------------------------------
create table public.slp_notes (
  id                  uuid primary key default gen_random_uuid(),
  slp_id              uuid not null references public.slps (id) on delete cascade,
  child_id            uuid not null references public.children (id) on delete cascade,
  session_instance_id uuid references public.session_instances (id) on delete set null,
  assessment_id       uuid references public.assessments (id) on delete set null,
  body                text not null check (length(btrim(body)) > 0),
  created_at          timestamptz not null default now()
);

create index slp_notes_child_id_idx on public.slp_notes (child_id);

alter table public.slp_notes enable row level security;
create policy "slp_notes select for caregiver or linked slp"
  on public.slp_notes for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );
create policy "slp_notes insert by the linked slp"
  on public.slp_notes for insert
  to authenticated
  with check (slp_id = auth.uid() and public.current_user_is_slp_for(child_id));
-- No UPDATE or DELETE policies: notes are append-only for everyone but the
-- service role. Revoking the link ends future notes; existing ones remain
-- part of the child's record.

-- --------------------------------------------------------------------------
-- Persistence gaps.
-- --------------------------------------------------------------------------
alter table public.assessments
  add column concern_text text;

alter table public.session_instances
  add column downward_advisory jsonb;

comment on column public.assessments.concern_text is
  'The caregiver''s free-text concern (§7.1), captured at scoring alongside the free_text_concern flag. Routed to human review via the SLP surface.';
comment on column public.session_instances.downward_advisory is
  'Downward-advisory evaluation computed at /sessions/complete when this activity had an established baseline: { advise, reason, baseline, recent }. Stored for every computed evaluation (advise true or false) for SLP trend review and §12 validation work. Advisory-only — never moves the variant.';
