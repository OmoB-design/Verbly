-- ============================================================================
-- Verbly — record which variant a session instance ran
-- ============================================================================
-- The advancement rule (README/PHASES): a failing retake triggers the
-- Simplified Session. /sessions/start decides server-side which variant of a
-- session's content to serve (main vs simplified — the client never chooses).
-- Data-integrity convention: an instance must record what it actually ran, so
-- already-collected data never changes meaning. content_version pins WHICH
-- content; this flag pins WHICH VARIANT within it.
-- ============================================================================

alter table public.session_instances
  add column ran_simplified boolean not null default false;

comment on column public.session_instances.ran_simplified is
  'True when /sessions/start served this instance the session''s Simplified variant (after a simplify_triggered outcome). The variant decision is server-authoritative.';
