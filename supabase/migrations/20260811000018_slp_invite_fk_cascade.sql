-- ============================================================================
-- Verbly — slp_invites FK delete behaviour (caught by e2e account-deletion)
-- ============================================================================
-- slp_invites.created_by / redeemed_by shipped in 017 without ON DELETE
-- actions, so a caregiver deleting their account was blocked by their own
-- outstanding invites (the auth.users → caregivers cascade hit NO ACTION).
--   • created_by  → CASCADE: invites are the caregiver's artifacts and die
--     with the account (children cascade separately via primary_caregiver_id).
--   • redeemed_by → SET NULL: the redemption is history on the caregiver's
--     invite; an SLP deleting their account shouldn't erase it or be blocked.

alter table public.slp_invites
  drop constraint slp_invites_created_by_fkey,
  add constraint slp_invites_created_by_fkey
    foreign key (created_by) references public.caregivers (id) on delete cascade;

alter table public.slp_invites
  drop constraint slp_invites_redeemed_by_fkey,
  add constraint slp_invites_redeemed_by_fkey
    foreign key (redeemed_by) references public.slps (id) on delete set null;
