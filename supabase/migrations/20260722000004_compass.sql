-- ============================================================================
-- Verbly — Communication Compass
-- ============================================================================
-- The onboarding placement assessment. Two rules from DATABASE.md govern it:
--   * compass_content is versioned clinical content (schema_version), same
--     content-vs-code discipline as the curriculum — seeded via the reviewed
--     content path, never authored/edited through the API.
--   * assessments pin the schema_version that scored them, and keep the full
--     raw response payload so responses can be RE-scored against a future
--     schema_version without re-administering — intentional redundancy.
--
-- The §6.2 ELSE branch (ambiguous placement) currently ALWAYS resolves to
-- placing the child at the tentative candidate phase — no SLP-flag state is
-- written. placement_mode records how the placement was reached.
-- ============================================================================

create type placement_mode as enum (
  'start_directly',
  'readiness_module_triggered',
  'caregiver_override'
);

-- --------------------------------------------------------------------------
-- compass_content — versioned item bank, domain weights, decision tree.
-- Distinct version lineage from curriculum content: schema_version, never
-- merged with curriculum content_version.
-- --------------------------------------------------------------------------
create table public.compass_content (
  id             uuid primary key default gen_random_uuid(),
  schema_version integer not null,
  -- Item bank, §5.2 domain weights, §6.1 phase decision tree, red-flag list.
  -- Structured content — bumped on edit, reviewed as a clinical change.
  content_json   jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  constraint compass_content_version_unique unique (schema_version)
);

-- --------------------------------------------------------------------------
-- assessments — one finalized (or in-progress) Compass run per child.
-- --------------------------------------------------------------------------
create table public.assessments (
  id                uuid primary key default gen_random_uuid(),
  child_id          uuid not null references public.children (id) on delete cascade,
  -- Pins which scoring logic produced this result — critical, since domain
  -- weights/thresholds are explicitly tunable, evolving parameters.
  schema_version    integer not null,
  domain_scores     jsonb,
  -- Full response payload kept ALONGSIDE normalized scores specifically so
  -- responses can be re-scored against a future schema_version. Intentional
  -- redundancy, not a cleanup target.
  raw_payload       jsonb,
  recommended_phase integer,
  confidence        numeric(4, 3),
  placement_mode    placement_mode,
  created_at        timestamptz not null default now(),
  finalized_at      timestamptz
);

create index assessments_child_id_idx on public.assessments (child_id);

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.compass_content enable row level security;
alter table public.assessments enable row level security;

-- compass_content: shared, versioned reference content. Readable by any
-- authenticated user; writable only by the service role (seeding).
create policy "compass_content readable by authenticated"
  on public.compass_content for select
  to authenticated
  using (true);

-- assessments: the phase decision tree / domain weighting / ELSE-branch
-- fallback are server-authoritative (Compass Edge Functions, service role) —
-- no client submits recommended_phase/confidence. Users therefore only READ
-- their own child's finalized result; writes happen with the service role.
create policy "assessments select for caregiver or linked slp"
  on public.assessments for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );
