-- ============================================================================
-- Verbly — Curriculum Content schema
-- ============================================================================
-- The 12-phase curriculum is CLINICAL CONTENT, not application logic. It lives
-- as structured, versioned records (see CLAUDE.md → "Content vs. code
-- boundary" and DATABASE.md). These tables hold the structural shell; the
-- actual clinical wording (activity steps, RL behavior scripts, scoring
-- criteria, Simplified Sessions) is seeded from reviewed content files via a
-- privileged (service-role) path, never authored here and never edited at
-- runtime through the API.
--
-- Versioning discipline: content is versioned, and data referencing content is
-- immutable against later edits. Rows here are bumped (new content_version) on
-- edit; consuming rows (session_instances, etc., added in a later migration)
-- pin the version they ran under. Nothing here rewrites history.
-- ============================================================================

create schema if not exists curriculum_content;

-- --------------------------------------------------------------------------
-- Canonical, unified age-band table referenced by ALL phases.
-- Replaces the curriculum's original inconsistent per-phase ranges.
-- NOTE: this is a DISTINCT system from the Compass's own placement age bands
-- (coarser scale, different purpose) — the two must never be merged.
-- --------------------------------------------------------------------------
create table curriculum_content.age_bands (
  id             uuid primary key default gen_random_uuid(),
  label          text not null,               -- e.g. '3-7', '8-14'
  min_age_months integer not null,
  max_age_months integer not null,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  constraint age_band_range_valid check (min_age_months <= max_age_months),
  constraint age_band_label_unique unique (label)
);

-- --------------------------------------------------------------------------
-- Phases (12). Structural metadata only; clinical detail lives in sessions.
-- --------------------------------------------------------------------------
create table curriculum_content.phases (
  id                     uuid primary key default gen_random_uuid(),
  phase_number           integer not null,     -- 1..12
  name                   text not null,
  clinical_goal          text,
  has_simplified_session boolean not null default true,
  content_version        integer not null default 1,
  created_at             timestamptz not null default now(),
  constraint phase_number_range check (phase_number between 1 and 12),
  -- A given phase_number can have multiple content_versions coexisting.
  constraint phase_number_version_unique unique (phase_number, content_version)
);

-- --------------------------------------------------------------------------
-- Sessions. content_json carries the versioned RL behavior script (trigger
-- interval, question text, answer options, per-option credit values, branch
-- targets), scoring criteria, activity steps, and the Simplified Session
-- variant. age_band_id is nullable — not every session is age-variant, and the
-- MEANING of an age band's variance (content-only vs. also fading target)
-- lives inside this content_json, not in the age_bands table.
-- --------------------------------------------------------------------------
create table curriculum_content.sessions (
  id              uuid primary key default gen_random_uuid(),
  phase_id        uuid not null references curriculum_content.phases (id) on delete cascade,
  phase_number    integer not null,            -- denormalized per DATABASE.md
  session_number  integer not null,
  age_band_id     uuid references curriculum_content.age_bands (id),
  content_json    jsonb not null default '{}'::jsonb,
  content_version integer not null default 1,
  created_at      timestamptz not null default now(),
  constraint session_identity_unique
    unique (phase_id, session_number, age_band_id, content_version)
);

create index sessions_phase_id_idx on curriculum_content.sessions (phase_id);
create index sessions_age_band_id_idx on curriculum_content.sessions (age_band_id);

-- ============================================================================
-- Access control
-- ============================================================================
-- Curriculum content is SHARED reference data, not owned by any caregiver.
-- Authenticated users may READ it; nobody writes it via the API. Seeding is
-- done with the service-role key (which bypasses RLS), gated by the clinical
-- content-review process in CONTRIBUTING.md.

grant usage on schema curriculum_content to anon, authenticated, service_role;
-- authenticated: normal app reads. service_role: privileged reads from the
-- server-authoritative route handlers (e.g. /sessions/start resolving the
-- version-pinned content script). service_role bypasses RLS but still needs
-- table privileges on a non-public schema.
grant select on all tables in schema curriculum_content to authenticated, service_role;

alter table curriculum_content.age_bands enable row level security;
alter table curriculum_content.phases enable row level security;
alter table curriculum_content.sessions enable row level security;

create policy "age_bands readable by authenticated"
  on curriculum_content.age_bands for select
  to authenticated using (true);

create policy "phases readable by authenticated"
  on curriculum_content.phases for select
  to authenticated using (true);

create policy "sessions readable by authenticated"
  on curriculum_content.sessions for select
  to authenticated using (true);

-- No INSERT/UPDATE/DELETE policies: with RLS enabled and no such policy, the
-- anon/authenticated roles cannot write. Only the service role (bypasses RLS)
-- can seed/update content.
