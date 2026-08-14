/**
 * Product limits (owner rulings). The child-profile cap is ALSO enforced by a
 * database trigger (migration 019 — enforce_child_profile_cap); this constant
 * exists for the friendly app-layer check and UI copy. Change both together.
 */
export const CHILD_PROFILE_CAP = 5;
