-- ============================================================================
-- Verbly — Communication Compass v2.1.0 persistence
-- ============================================================================
-- Rebuilds `assessments` to the blueprint §8/§9 (v2.1.0) shape, adds
-- `placement_overrides` (§6.5), and adds the Compass onboarding fields to
-- `children` (§6.6). The old `assessments` (schema-version-004) is DROPPED and
-- recreated — it is dev/empty (0 rows; confirmed), so there is no data to
-- migrate and no v1 A/B/C rows needing disposition.
--
-- NOT done here (deliberate, flagged): retiring `children.current_age_band_id`
-- (the RL age-bracket-runtime still reads it) in favour of the new
-- `children.age_bracket`. Both are empty, so they coexist harmlessly during
-- dev; unifying the RL runtime onto `age_bracket` is a focused follow-up before
-- any real onboarding. Do not populate both in production.
-- ============================================================================

-- Old assessments + its enum are unused (empty). Drop and rebuild.
drop table if exists public.assessments cascade;
drop type if exists placement_mode;

create table public.assessments (
  id                              uuid primary key default gen_random_uuid(),
  child_id                        uuid not null references public.children (id) on delete cascade,
  status                          text not null default 'in_progress' check (status in ('in_progress', 'scored')),
  age_bracket                     text check (age_bracket in ('3-7', '8-12', '10-14')),
  age_months_at_assessment        integer check (age_months_at_assessment between 36 and 179),
  second_adult_available          text check (second_adult_available in ('usually', 'sometimes', 'no')),
  compass_overall_score           smallint check (compass_overall_score between 0 and 100),
  confidence                      numeric(3, 2) check (confidence between 0 and 1),
  compass_domain_scores           jsonb,
  recommended_phase               smallint check (recommended_phase between 1 and 12),
  starting_phase                  smallint check (starting_phase between 1 and 12),
  placement_source                text not null default 'engine' check (placement_source in ('engine', 'caregiver_override')),
  placement_mode                  text check (placement_mode in ('start_directly', 'readiness_module_first')),
  start_in_simplified             boolean not null default false,
  two_adult_advisory              boolean not null default false,
  age_floor_next_bracket_months   integer,
  red_flags                       jsonb,
  referral_recommended            boolean not null default false,
  suggested_reassessment_interval text,
  schema_version                  text,      -- Compass semver, e.g. "2.1.0"
  curriculum_version              text,
  raw_payload                     jsonb,     -- full §8 payload (source of truth for re-scoring)
  created_at                      timestamptz not null default now(),
  completed_at                    timestamptz
);

create index assessments_child_id_idx on public.assessments (child_id);

-- §6.5 caregiver override audit — both phases + timestamp (dissertation signal).
create table public.placement_overrides (
  id              uuid primary key default gen_random_uuid(),
  assessment_id   uuid not null references public.assessments (id) on delete cascade,
  child_id        uuid not null references public.children (id) on delete cascade,
  engine_phase    smallint not null check (engine_phase between 1 and 12),
  caregiver_phase smallint not null check (caregiver_phase between 1 and 12),
  confirmed_at    timestamptz not null default now()
);

create index placement_overrides_child_idx on public.placement_overrides (child_id);

-- §6.6 Compass onboarding fields on children. ADD (see note above re current_age_band_id).
alter table public.children
  add column age_bracket text check (age_bracket in ('3-7', '8-12', '10-14')),
  add column bracket_assigned_at_months integer,
  add column age_floor_next_bracket_months integer,
  add column second_adult_available text check (second_adult_available in ('usually', 'sometimes', 'no'));

-- ============================================================================
-- RLS — assessments + placement_overrides are child-scoped; server-authoritative
-- writes (Compass endpoints use the service role). Caregivers/linked SLPs read.
-- ============================================================================
alter table public.assessments enable row level security;
alter table public.placement_overrides enable row level security;

create policy "assessments select for caregiver or linked slp"
  on public.assessments for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );

create policy "placement_overrides select for caregiver or linked slp"
  on public.placement_overrides for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );
