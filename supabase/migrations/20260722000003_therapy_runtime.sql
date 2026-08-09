-- ============================================================================
-- Verbly — Therapy runtime & longitudinal record
-- ============================================================================
-- phase_history (the single audit trail), session runtime tables, the
-- phase-specific extension tables, and vocalization logs.
--
-- Design rules carried from ARCHITECTURE.md / DATABASE.md:
--   * ONE audit trail: every phase transition writes to phase_history with a
--     trigger_reason enum. No parallel mechanism-specific tables.
--   * Data pins the content_version it ran under; content edits never rewrite
--     history.
--   * Not every phase is "one score per session" — phases 4/6/11/12 have their
--     own extension tables, not forced into session_checkins.
--   * RLS scopes every child-scoped table to the owning caregiver (+ linked,
--     read-only SLP).
--
-- Enum vs. text boundary (deliberate):
--   * System/engine states are ENUMS (trigger_reason, session_outcome,
--     participant_role) — they are application logic, stable, and small.
--   * Clinical taxonomies that live in versioned content (response_category,
--     communication method, prompt-level labels) are TEXT, validated at the
--     app layer against the pinned content_version — NOT baked into the DB, so
--     a content revision never requires a schema migration. See CLAUDE.md →
--     "Content vs. code boundary".
-- ============================================================================

-- --------------------------------------------------------------------------
-- Enums (engine states)
-- --------------------------------------------------------------------------
create type trigger_reason as enum (
  'assessment_placement',
  'rl_advance',
  'caregiver_regression',
  'caregiver_override',
  'age_bracket_transition'
);

create type session_outcome as enum (
  'advance',
  'retake',
  'simplify_triggered'
);

create type participant_role as enum (
  'primary',
  'secondary',
  'peer'
);

-- ============================================================================
-- phase_history — the single audit trail for EVERY phase transition
-- ============================================================================
create table public.phase_history (
  id              uuid primary key default gen_random_uuid(),
  child_id        uuid not null references public.children (id) on delete cascade,
  phase_id        uuid not null references curriculum_content.phases (id),
  entered_at      timestamptz not null default now(),
  trigger_reason  trigger_reason not null,
  content_version integer not null
);

create index phase_history_child_id_idx on public.phase_history (child_id);
create index phase_history_child_entered_idx
  on public.phase_history (child_id, entered_at);

-- ============================================================================
-- Session runtime
-- ============================================================================
create table public.session_instances (
  id                   uuid primary key default gen_random_uuid(),
  child_id             uuid not null references public.children (id) on delete cascade,
  session_id           uuid not null references curriculum_content.sessions (id),
  content_version      integer not null,
  -- The single logged-in caregiver who ran this session (may be a secondary
  -- caregiver — the two-tier model allows secondaries to run sessions).
  ran_by_caregiver_id  uuid not null references public.caregivers (id),
  outcome              session_outcome,
  score_percent        numeric(5, 2),
  started_at           timestamptz not null default now(),
  completed_at         timestamptz
);

create index session_instances_child_id_idx on public.session_instances (child_id);

create table public.session_checkins (
  id                  uuid primary key default gen_random_uuid(),
  session_instance_id uuid not null references public.session_instances (id) on delete cascade,
  interval_index      integer not null,
  -- Spontaneous / Prompted / No-Response, or a phase-specific variant (e.g.
  -- Reversion-to-Single-Card for PECS Phase 4). Clinical taxonomy → text,
  -- validated against the pinned content_version at the app layer.
  response_category   text not null,
  -- Pulled from the session's content_json at the pinned content_version, NOT
  -- recomputed against current content.
  credit_value        numeric(5, 2) not null,
  created_at          timestamptz not null default now(),
  constraint session_checkin_interval_unique
    unique (session_instance_id, interval_index)
);

create index session_checkins_session_idx
  on public.session_checkins (session_instance_id);

create table public.session_participants (
  id                  uuid primary key default gen_random_uuid(),
  session_instance_id uuid not null references public.session_instances (id) on delete cascade,
  participant_role    participant_role not null,
  -- Null for unauthenticated helpers/peers (no account required).
  caregiver_id        uuid references public.caregivers (id) on delete set null,
  display_name        text,
  created_at          timestamptz not null default now()
);

create index session_participants_session_idx
  on public.session_participants (session_instance_id);

-- ============================================================================
-- Phase-specific extension tables (see PHASES.md for clinical rationale)
-- ============================================================================

-- Phase 4 (PECS 1): per-trial prompt level in the 5-level fading hierarchy
-- (1 = Full hand-over-hand … 5 = None). Feeds the next trial's starting level.
create table public.prompt_fading_log (
  id                  uuid primary key default gen_random_uuid(),
  session_instance_id uuid not null references public.session_instances (id) on delete cascade,
  trial_index         integer not null,
  prompt_level        smallint not null,
  created_at          timestamptz not null default now(),
  constraint prompt_level_range check (prompt_level between 1 and 5),
  constraint prompt_fading_trial_unique unique (session_instance_id, trial_index)
);

-- Phase 6 (PECS 3): in-trial 4-step error-correction procedure
-- (step 1 Model → 2 Prompt → 3 Switch → 4 Retry). Distinct from the
-- between-session retake/simplify flow — do NOT conflate.
create table public.error_correction_events (
  id                  uuid primary key default gen_random_uuid(),
  session_instance_id uuid not null references public.session_instances (id) on delete cascade,
  trial_index         integer not null,
  step                smallint not null,
  resolved            boolean not null default false,
  created_at          timestamptz not null default now(),
  constraint error_correction_step_range check (step between 1 and 4)
);

create index error_correction_session_idx
  on public.error_correction_events (session_instance_id);

-- Phase 11 (Daily Routines): which communication method was used per instance,
-- across partners/routines. Clinical taxonomy (PECS/gesture/vocalization/AAC/
-- gaze) kept as text, not enum.
create table public.communication_method_log (
  id                  uuid primary key default gen_random_uuid(),
  session_instance_id uuid not null references public.session_instances (id) on delete cascade,
  method              text not null,
  partner             text,
  routine             text,
  created_at          timestamptz not null default now()
);

create index communication_method_session_idx
  on public.communication_method_log (session_instance_id);

-- Phase 12 (Vocal Approximation): a 5-step shaping curve PER target sound/word.
-- Longitudinal (per child+target), NOT per session — so it references child_id
-- directly, with an append-only history of step changes alongside the current
-- state. See PHASES.md.
create table public.shaping_curve (
  id           uuid primary key default gen_random_uuid(),
  child_id     uuid not null references public.children (id) on delete cascade,
  target       text not null,
  current_step smallint not null default 1,
  updated_at   timestamptz not null default now(),
  constraint shaping_step_range check (current_step between 1 and 5),
  constraint shaping_curve_child_target_unique unique (child_id, target)
);

create index shaping_curve_child_idx on public.shaping_curve (child_id);

create table public.shaping_curve_events (
  id               uuid primary key default gen_random_uuid(),
  shaping_curve_id uuid not null references public.shaping_curve (id) on delete cascade,
  step             smallint not null,
  note             text,
  created_at       timestamptz not null default now(),
  constraint shaping_event_step_range check (step between 1 and 5)
);

create index shaping_curve_events_curve_idx
  on public.shaping_curve_events (shaping_curve_id);

-- ============================================================================
-- Vocalization logs (audio in Supabase Storage — never a public path)
-- ============================================================================
create table public.vocalization_logs (
  id                  uuid primary key default gen_random_uuid(),
  child_id            uuid not null references public.children (id) on delete cascade,
  session_instance_id uuid references public.session_instances (id) on delete set null,
  -- Storage object path only. Reads resolve to a signed, time-limited URL via
  -- an Edge Function — never stored/served as a permanent public URL.
  storage_path        text not null,
  -- Non-audio metadata must carry enough context that the log stays useful
  -- without playback (accessibility requirement, DESIGN.md).
  context_tag         text,
  target_sound        text,
  recorded_at         timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

create index vocalization_logs_child_id_idx on public.vocalization_logs (child_id);

-- ============================================================================
-- RLS helper: resolve a session_instance to its child (SECURITY DEFINER so it
-- can be used inside policies on session-scoped tables without recursion)
-- ============================================================================
create or replace function public.session_instance_child(_sid uuid)
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select child_id from public.session_instances where id = _sid;
$$;

-- ============================================================================
-- Row-Level Security
-- ============================================================================
alter table public.phase_history            enable row level security;
alter table public.session_instances        enable row level security;
alter table public.session_checkins         enable row level security;
alter table public.session_participants     enable row level security;
alter table public.prompt_fading_log        enable row level security;
alter table public.error_correction_events  enable row level security;
alter table public.communication_method_log enable row level security;
alter table public.shaping_curve            enable row level security;
alter table public.shaping_curve_events     enable row level security;
alter table public.vocalization_logs        enable row level security;

-- ---- phase_history: READ-ONLY to users. -----------------------------------
-- Every transition is a server decision (Compass finalize, RL advance/complete,
-- caregiver regression/override are all Edge Functions in API.md). Users never
-- write this table directly; writes happen with the service role. Caregivers
-- and linked SLPs may read.
create policy "phase_history select for caregiver or linked slp"
  on public.phase_history for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );

-- ---- session_instances -----------------------------------------------------
-- Caregivers in the account may create/read their child's sessions. The
-- outcome/score_percent fields are authoritative server computations
-- (/sessions/complete Edge Function, service role) — there is deliberately NO
-- user UPDATE policy, so a client cannot set or alter a score/outcome.
create policy "session_instances select for caregiver or linked slp"
  on public.session_instances for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );

create policy "session_instances insert by running caregiver"
  on public.session_instances for insert
  to authenticated
  with check (
    ran_by_caregiver_id = auth.uid()
    and public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
  );

-- ---- Child-scoped-via-session tables (record what happened; direct queries) -
-- session_checkins / session_participants / extension logs: readable by
-- caregiver+SLP, insertable by an account caregiver, scoped through the parent
-- session_instance's child.
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'session_checkins',
    'session_participants',
    'prompt_fading_log',
    'error_correction_events',
    'communication_method_log'
  ]
  loop
    execute format($f$
      create policy "%1$s select via session child"
        on public.%1$s for select to authenticated
        using (
          public.current_user_is_caregiver_for(public.child_primary_caregiver(public.session_instance_child(session_instance_id)))
          or public.current_user_is_slp_for(public.session_instance_child(session_instance_id))
        );
    $f$, tbl);

    execute format($f$
      create policy "%1$s insert via session child"
        on public.%1$s for insert to authenticated
        with check (
          public.current_user_is_caregiver_for(public.child_primary_caregiver(public.session_instance_child(session_instance_id)))
        );
    $f$, tbl);
  end loop;
end $$;

-- ---- shaping_curve (per child+target) --------------------------------------
create policy "shaping_curve select for caregiver or linked slp"
  on public.shaping_curve for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );

create policy "shaping_curve write by account caregiver"
  on public.shaping_curve for all
  to authenticated
  using (public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id)))
  with check (public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id)));

create policy "shaping_curve_events select via curve"
  on public.shaping_curve_events for select
  to authenticated
  using (
    exists (
      select 1 from public.shaping_curve sc
      where sc.id = shaping_curve_id
        and (
          public.current_user_is_caregiver_for(public.child_primary_caregiver(sc.child_id))
          or public.current_user_is_slp_for(sc.child_id)
        )
    )
  );

create policy "shaping_curve_events insert via curve"
  on public.shaping_curve_events for insert
  to authenticated
  with check (
    exists (
      select 1 from public.shaping_curve sc
      where sc.id = shaping_curve_id
        and public.current_user_is_caregiver_for(public.child_primary_caregiver(sc.child_id))
    )
  );

-- ---- vocalization_logs -----------------------------------------------------
create policy "vocalization_logs select for caregiver or linked slp"
  on public.vocalization_logs for select
  to authenticated
  using (
    public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id))
    or public.current_user_is_slp_for(child_id)
  );

create policy "vocalization_logs insert by account caregiver"
  on public.vocalization_logs for insert
  to authenticated
  with check (public.current_user_is_caregiver_for(public.child_primary_caregiver(child_id)));
