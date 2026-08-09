# API.md

Endpoint specification for Verbly. Covers what's a direct Supabase client call versus what must be a server-authoritative Edge Function, and the shape of each. Table/column names reference `DATABASE.md`.

---

## API Philosophy: Two Access Patterns

Not everything needs a custom endpoint. Supabase gives every table a REST/RPC surface via PostgREST, protected by Row-Level Security. Verbly uses two distinct patterns and should not blur them:

1. **Direct client queries (PostgREST + RLS)** — for straightforward reads/writes where the client can be trusted to just fetch or insert a row and RLS does the access-control work. Example: a caregiver fetching their own child's `session_instances` history.
2. **Server-authoritative Edge Functions** — for anything involving *decision logic* (scoring, advancement, placement) that must not be computed client-side, because the client should never be the source of truth for whether a child passed a phase, what their Compass placement is, or what content version applied. If the RL's decision logic lived in the client app, two app versions in the field could disagree on the same child's outcome — these functions exist specifically to prevent that.

**Rule of thumb:** if an operation only stores what happened, it's a direct query. If an operation decides what happens next, it's an Edge Function.

**Platform note (web pivot):** a browser-based client calling Supabase directly is a different trust boundary than a mobile app was — configure Supabase's allowed origins/CORS explicitly for the deployed domain, and prefer calling Edge Functions and PostgREST from server-side code (e.g. Next.js API routes/server components) where the operation involves anything sensitive, rather than only from client-side JavaScript, consistent with the httpOnly-cookie auth approach in `ARCHITECTURE.md`.

---

## Auth

Handled by Supabase Auth directly (signup, login, password reset with single-use time-limited tokens) — no custom endpoints needed. `caregivers`/`slps` rows are created via a Postgres trigger on `auth.users` insert, tagged by account type at signup.

---

## Children (direct queries)

| Operation | Pattern |
|---|---|
| Create child profile | Direct insert into `children`, `primary_caregiver_id` = current caregiver. No SLP approval or link required — always self-serve. |
| Read/update child profile | Direct query, RLS-scoped to owning caregiver (or linked SLP, read-only) |
| Delete child (cascade) | **Edge Function**, not a direct delete — must cascade through `session_instances` → `session_checkins`/extension tables → `phase_history` → `assessments` → storage objects in one transaction, per the deletion cascade in `DATABASE.md`. A direct client-side delete risks an incomplete cascade. |

---

## Communication Compass

| Endpoint | Type | Purpose |
|---|---|---|
| `POST /compass/start` | Edge Function | Initializes an `assessments` row pinned to the current `compass_content.schema_version`; returns the first domain module's items |
| `POST /compass/respond` | Edge Function | Accepts one domain module's responses; returns next module, or triggers the supplemental module if confidence < 0.6 |
| `POST /compass/finalize` | Edge Function | Runs the phase decision tree (§6.1) against completed responses; writes `recommended_phase`, `confidence`, `placement_mode` to `assessments`; on ambiguous profiles (§6.2 ELSE branch), currently always resolves `placement_mode: start_directly` at the tentative candidate phase (no SLP-flag path at this stage); writes the seeding row to `phase_history` (`trigger_reason: assessment_placement`) |
| `POST /compass/override` | Edge Function | Caregiver overrides `recommended_phase` before starting; requires the confirmation-step payload; writes `phase_history` with `trigger_reason: caregiver_override` |
| `GET /compass/result/{child_id}` | Direct query | Read the finalized result — no decision logic involved in a read |

**Why finalize can't be a direct insert:** the phase decision tree, domain weighting, and ELSE-branch fallback are exactly the kind of versioned clinical logic that must run once, server-side, against the pinned `schema_version` — not be recomputed by whatever app version happens to be installed.

---

## Session Runtime

| Endpoint | Type | Purpose |
|---|---|---|
| `POST /sessions/start` | Edge Function | Creates a `session_instances` row pinned to the current session's `content_version`; returns the full RL behavior script (intervals, question text, branch logic) for the runtime to execute locally |
| `POST /sessions/checkin` | Direct query | Inserts a `session_checkins` row (interval index, response category, credit value — credit value is read from the already-fetched, version-pinned script, not recalculated). This is deliberately a direct query, not an Edge Function — no decision is being made, just a fact recorded. |
| `POST /sessions/complete` | Edge Function | Computes `score_percent` from the session's checkins, applies the 75% global rule, determines `outcome` (`advance` / `retake` / `simplify_triggered`), and on advance/regression writes the corresponding `phase_history` row |
| `POST /sessions/participants` | Direct query | Logs `session_participants` rows (role tag, optional display name) — no account required for secondary/peer participants |

**Phase-specific extension writes** (`prompt_fading_log`, `error_correction_events`, `communication_method_log`, `shaping_curve`) are direct queries — they record what happened during a session, not a decision about what happens next. The exception is anything that feeds back into the *next* trial's starting point (e.g. PECS Phase 1's prompt-level trend) — that read-and-decide step belongs inside `/sessions/start`'s Edge Function logic, not left to the client to compute.

---

## Phase History

| Endpoint | Type | Purpose |
|---|---|---|
| `GET /children/{id}/phase-history` | Direct query | Full audit trail, RLS-scoped |
| `POST /phase-history/regress` | Edge Function | Caregiver-initiated regression to an earlier phase, informed by an in-app suggestion — writes `trigger_reason: caregiver_regression`. An Edge Function rather than a direct insert because it must validate the target phase against the child's actual history (can't regress to a phase never reached) |
| (internal) age-bracket transition | Edge Function, invoked from `/sessions/complete` | Evaluates pass rate / prompt-level trend / retake frequency within the current age bracket from `phase_history` + `session_instances` before deciding whether/how fast to move the child to the next age-appropriate content variant — this is the one place age-band logic requires reading history as a decision input, not just storing it |

---

## SLP Dashboard

| Endpoint | Type | Purpose |
|---|---|---|
| `GET /slp/children` | Direct query | List of children linked via `slp_child_links`, RLS-scoped to the requesting SLP |
| `GET /slp/children/{id}/report` | Direct query | Progress/phase history/milestones for one linked child — read-only, no write access |
| SLP–child link creation | **Not exposed via API for the dissertation build** | Created manually in the database per the linking design in `ARCHITECTURE.md`; no invite/accept endpoint exists at this stage |

---

## Vocalization Logs

| Endpoint | Type | Purpose |
|---|---|---|
| `POST /vocalization-logs` | Direct query + Storage upload | Metadata row + audio file to Supabase Storage |
| `GET /vocalization-logs/{id}/audio-url` | Edge Function | Issues a signed, time-limited URL — never returns a permanent path |

---

## Notifications

| Endpoint | Type | Purpose |
|---|---|---|
| `GET /notification-preferences` / `PATCH /notification-preferences` | Direct query | Frequency setting (`daily`/`weekly`/`off`) |
| (internal) notification dispatch | Scheduled Edge Function | Generates data-driven nudges (session reminders, milestone alerts) and, separately, encouragement-line sends, respecting the caregiver's frequency setting |

---

## What's Deliberately Not Here

- **No endpoint lets a client submit a `score_percent` or `recommended_phase` directly** — these are always server-computed, per the philosophy at the top of this file.
- **No content-editing endpoints.** Curriculum and Compass content updates are seeded from reviewed content files (see `CLAUDE.md`, `CONTRIBUTING.md`), not edited through the API at runtime.
