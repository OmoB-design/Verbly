-- ============================================================================
-- Verbly — Readiness Checks (§6.3, owner-approved content v1.0.0, 2026-08-09)
-- ============================================================================
-- The "readiness module" of placement_mode = readiness_module_first: a one-shot
-- caregiver-report 5-item yes/no gate before the first session of the placed
-- phase. Owner rulings: pass = ≥4 yes; a lone NO on the phase's HARD item →
-- "keep an eye on [X]" flag (never blocks); ≤3 yes → phase unchanged, first
-- session serves the Simplified variant. Replaces the interim ease-in that
-- served Simplified unconditionally.

-- Versioned clinical content, same governance pattern as compass_content.
create table public.readiness_content (
  id             uuid primary key default gen_random_uuid(),
  schema_version integer not null,
  content_json   jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  constraint readiness_content_version_unique unique (schema_version)
);

alter table public.readiness_content enable row level security;
-- Read-only reference content for signed-in users; only the service role seeds.
create policy "readiness_content readable by authenticated"
  on public.readiness_content for select
  to authenticated using (true);

-- One result per assessment (one-shot rule enforced by the unique constraint).
-- Answers are the caregiver's facts; scoring is server-authoritative, so
-- inserts happen via the service role only (no user write policy).
create table public.readiness_check_results (
  id                uuid primary key default gen_random_uuid(),
  assessment_id     uuid not null references public.assessments (id) on delete cascade,
  child_id          uuid not null references public.children (id) on delete cascade,
  phase_number      smallint not null check (phase_number between 1 and 12),
  answers           jsonb not null,
  yes_count         smallint not null check (yes_count between 0 and 5),
  passed            boolean not null,
  hard_item_flagged boolean not null default false,
  flag_phrase       text,
  schema_version    text not null,
  created_at        timestamptz not null default now(),
  constraint readiness_one_shot unique (assessment_id)
);

create index readiness_check_results_child_id_idx on public.readiness_check_results (child_id);

alter table public.readiness_check_results enable row level security;
create policy "readiness results select for caregiver or linked slp"
  on public.readiness_check_results for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );

comment on table public.readiness_content is
  'Versioned readiness-check item sets (owner-approved clinical content; see content/readiness/READINESS_CHECKS_v1.md). Edits require a new schema_version + owner sign-off.';
comment on table public.readiness_check_results is
  'One-shot readiness-check outcome per assessment. passed=false → first session of the placed phase serves the Simplified variant; hard_item_flagged → "keep an eye on [flag_phrase]" shown to the caregiver. Immutable (unique per assessment).';
