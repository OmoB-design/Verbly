-- ============================================================================
-- Verbly — notifications log (dedupe + audit)
-- ============================================================================
-- Email is the sole notification channel (Resend). The scheduled dispatch
-- (Vercel Cron → /api/cron/notifications) is server-authoritative and writes
-- every send here, for two reasons:
--   1. Idempotency/dedupe — a unique (caregiver_id, dedupe_key) stops the same
--      milestone/reminder/encouragement being emailed twice (e.g. cron retries,
--      or two runs in one cadence window).
--   2. Audit — "what did we email this caregiver, and when."
--
-- Both notification types from ARCHITECTURE.md share this table (data-driven
-- nudges + encouragement lines), all subject to the caregiver's single
-- daily/weekly/off frequency in `notification_preferences`.
-- ============================================================================

create type notification_type as enum (
  'session_reminder',
  'milestone',
  'retake_suggestion',
  'encouragement'
);

create type notification_status as enum ('sent', 'dry_run', 'failed');

create table public.notifications_log (
  id           uuid primary key default gen_random_uuid(),
  caregiver_id uuid not null references public.caregivers (id) on delete cascade,
  child_id     uuid references public.children (id) on delete set null,
  type         notification_type not null,
  -- Stable key identifying the specific thing being notified (e.g.
  -- "milestone:<phase_history_id>", "reminder:<child_id>:<yyyy-mm-dd>"). Unique
  -- per caregiver so it is emailed at most once.
  dedupe_key   text not null,
  subject      text,
  status       notification_status not null default 'sent',
  error        text,
  created_at   timestamptz not null default now(),
  constraint notifications_log_dedupe_unique unique (caregiver_id, dedupe_key)
);

create index notifications_log_caregiver_idx on public.notifications_log (caregiver_id, created_at desc);

-- ============================================================================
-- RLS: caregivers may READ their own notification history; only the service
-- role (the cron dispatcher) writes. No user insert/update/delete policy.
-- ============================================================================
alter table public.notifications_log enable row level security;

create policy "notifications_log select own"
  on public.notifications_log for select
  to authenticated
  using (caregiver_id = auth.uid());
