-- ============================================================================
-- Verbly — Account & Profile schema
-- ============================================================================
-- Caregivers, SLPs, children, SLP<->child links, and notification prefs.
--
-- Security model (see ARCHITECTURE.md / DATABASE.md):
--   * Row-Level Security is THE enforcement layer for child-data isolation,
--     not an application-side check.
--   * A caregiver's queries are scoped to their own child(ren).
--   * An SLP's queries are scoped to children present in slp_child_links for
--     their slp_id. SLP access is read-only.
--
-- This migration covers ONLY account/profile + child creation. Session-runtime
-- tables (session_instances, session_checkins, extension tables), the Compass
-- (assessments, compass_content), phase_history, and vocalization_logs are
-- deliberately deferred to later migrations, per the first build task.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------
create type caregiver_role as enum ('primary', 'secondary');

-- --------------------------------------------------------------------------
-- caregivers — one row per caregiver account, backed by Supabase Auth.
-- Two-tier model: only 'primary' holds account-level permissions (invite,
-- export, delete); 'secondary' can run sessions and add journal entries.
-- --------------------------------------------------------------------------
create table public.caregivers (
  id               uuid primary key references auth.users (id) on delete cascade,
  role             caregiver_role not null default 'primary',
  account_owner_id uuid references public.caregivers (id) on delete cascade,
  full_name        text,
  created_at       timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- slps — SLPs authenticate the same way caregivers do.
-- --------------------------------------------------------------------------
create table public.slps (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text,
  created_at timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- children — Tier 1 data (name, dob). current_phase_id is denormalized for
-- fast dashboard reads; the source of truth for placement is phase_history
-- (added in a later migration), so current_phase_id is nullable here.
-- --------------------------------------------------------------------------
create table public.children (
  id                          uuid primary key default gen_random_uuid(),
  primary_caregiver_id        uuid not null references public.caregivers (id) on delete cascade,
  name                        text not null,
  dob                         date,
  current_phase_id            uuid references curriculum_content.phases (id),
  content_version_at_creation integer,
  created_at                  timestamptz not null default now()
);

create index children_primary_caregiver_id_idx
  on public.children (primary_caregiver_id);

-- --------------------------------------------------------------------------
-- slp_child_links — the mechanism that scopes SLP read access.
-- For the dissertation build these rows are created manually (service role);
-- no self-serve invite/accept endpoint exists yet.
-- --------------------------------------------------------------------------
create table public.slp_child_links (
  id         uuid primary key default gen_random_uuid(),
  slp_id     uuid not null references public.slps (id) on delete cascade,
  child_id   uuid not null references public.children (id) on delete cascade,
  linked_at  timestamptz not null default now(),
  linked_by  text,
  constraint slp_child_link_unique unique (slp_id, child_id)
);

create index slp_child_links_slp_id_idx on public.slp_child_links (slp_id);
create index slp_child_links_child_id_idx on public.slp_child_links (child_id);

-- --------------------------------------------------------------------------
-- notification_preferences — a single frequency toggle covering both email
-- notification types (data-driven nudges + encouragement lines).
-- --------------------------------------------------------------------------
create table public.notification_preferences (
  caregiver_id uuid primary key references public.caregivers (id) on delete cascade,
  frequency    text not null default 'weekly' check (frequency in ('daily', 'weekly', 'off')),
  updated_at   timestamptz not null default now()
);

-- ============================================================================
-- Helper functions (SECURITY DEFINER) for RLS
-- ============================================================================
-- These bypass RLS internally so cross-table membership checks inside policies
-- don't recurse. Each is STABLE and pins search_path.

create or replace function public.current_user_is_caregiver_for(_primary uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    _primary = auth.uid()
    or exists (
      select 1 from public.caregivers c
      where c.id = auth.uid()
        and c.role = 'secondary'
        and c.account_owner_id = _primary
    );
$$;

create or replace function public.current_user_is_slp_for(_child_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.slp_child_links l
    where l.child_id = _child_id
      and l.slp_id = auth.uid()
  );
$$;

create or replace function public.child_primary_caregiver(_child_id uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select primary_caregiver_id from public.children where id = _child_id;
$$;

-- ============================================================================
-- New-user trigger: create the correct profile row on auth.users insert
-- ============================================================================
-- Tagged by signup metadata (account_type / role). SECURITY DEFINER so it can
-- insert into these tables regardless of RLS. See API.md → Auth.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account_type text := coalesce(new.raw_user_meta_data ->> 'account_type', 'caregiver');
  v_role         text := coalesce(new.raw_user_meta_data ->> 'role', 'primary');
  v_full_name    text := nullif(new.raw_user_meta_data ->> 'full_name', '');
begin
  if v_account_type = 'slp' then
    insert into public.slps (id, full_name)
    values (new.id, v_full_name);
  else
    insert into public.caregivers (id, role, full_name)
    values (new.id, v_role::caregiver_role, v_full_name);

    insert into public.notification_preferences (caregiver_id)
    values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.caregivers enable row level security;
alter table public.slps enable row level security;
alter table public.children enable row level security;
alter table public.slp_child_links enable row level security;
alter table public.notification_preferences enable row level security;

-- caregivers: a user sees their own row; a primary also sees their secondaries.
-- Inserts happen via the trigger (SECURITY DEFINER), so no INSERT policy.
create policy "caregivers select own or owned"
  on public.caregivers for select
  to authenticated
  using (id = auth.uid() or account_owner_id = auth.uid());

create policy "caregivers update own"
  on public.caregivers for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- slps: a user sees only their own SLP row.
create policy "slps select own"
  on public.slps for select
  to authenticated
  using (id = auth.uid());

create policy "slps update own"
  on public.slps for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- children: caregivers in the owning account (primary or secondary) can read;
-- a linked SLP can read (read-only — no write policies for SLPs).
create policy "children select for caregiver or linked slp"
  on public.children for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(primary_caregiver_id)
    or public.current_user_is_slp_for(id)
  );

-- Only the primary caregiver may create/modify/delete their own child rows.
-- (Cascade delete still goes through an Edge Function per API.md; this policy
-- is the RLS backstop.)
create policy "children insert own"
  on public.children for insert
  to authenticated
  with check (primary_caregiver_id = auth.uid());

create policy "children update own"
  on public.children for update
  to authenticated
  using (primary_caregiver_id = auth.uid())
  with check (primary_caregiver_id = auth.uid());

create policy "children delete own"
  on public.children for delete
  to authenticated
  using (primary_caregiver_id = auth.uid());

-- slp_child_links: readable by the SLP on the link and by the owning
-- caregiver. No write policies — links are created with the service role for
-- the dissertation cohort.
create policy "slp_child_links select for slp or owning caregiver"
  on public.slp_child_links for select
  to authenticated
  using (
    slp_id = auth.uid()
    or public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
  );

-- notification_preferences: owner-only.
create policy "notification_preferences select own"
  on public.notification_preferences for select
  to authenticated
  using (caregiver_id = auth.uid());

create policy "notification_preferences update own"
  on public.notification_preferences for update
  to authenticated
  using (caregiver_id = auth.uid())
  with check (caregiver_id = auth.uid());

create policy "notification_preferences insert own"
  on public.notification_preferences for insert
  to authenticated
  with check (caregiver_id = auth.uid());
