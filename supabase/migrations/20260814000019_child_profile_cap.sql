-- ============================================================================
-- Verbly — child-profile cap: 5 per caregiver account (owner ruling 2026-08-14)
-- ============================================================================
-- Review finding: the cap existed as an owner intention but had never reached
-- any document or line of code — a 6th profile was created legitimately. This
-- makes it real at the database layer (the app layer checks too, for a
-- friendly message; this trigger is the enforcement that can't be bypassed).
--
-- INSERT-only: existing over-cap accounts are grandfathered — nothing is
-- deleted, and every operation on existing children keeps working. The cap
-- value is duplicated in lib/limits.ts (CHILD_PROFILE_CAP); change both
-- together.

create or replace function public.enforce_child_profile_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.children where primary_caregiver_id = new.primary_caregiver_id) >= 5 then
    raise exception 'child profile limit reached (5 per caregiver account)'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger children_profile_cap
  before insert on public.children
  for each row execute function public.enforce_child_profile_cap();
