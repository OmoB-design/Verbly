# Verbly — engineering measurements (evaluation work order, 2026-09-05)

Tool-generated results for the dissertation's engineering claims. Environment:
app deployed on Vercel + Supabase Postgres (aws-eu-west-1); local runs on the
development Mac against the same hosted database. All latency figures are full
HTTP round trips including database work — *not* decision-logic-only timings.

> **Updated 2026-09-05 (second pass):** after the owner observed that local and
> deployed latency were nearly identical — implicating sequential database
> round trips, not server region — two independent fixes were applied and
> measured separately: (1) independent Supabase reads parallelized inside
> /sessions/start, /sessions/complete and the age-bracket runtime;
> (2) function region moved iad1 → dub1 (same region as the database).
> See "Latency optimization round" below. Lighthouse was also re-run against
> the real deployed URL (the first run audited localhost).

## Claim-by-claim verdicts

| Claim | Verdict | Evidence |
|---|---|---|
| Cyclomatic complexity M ≤ 5 | **Partially met — median M = 2; 48/64 functions ≤ 5** | `complexity-report.md` (every exception annotated; the largest, `mapPhase` M=19, is the §6.2 tree's twelve clinical predicates transcribed 1:1) |
| Client-side JS bundle | **Measured** — session runtime route 78.5 kB (route) / **199 kB first-load**; 102 kB shared baseline | `next-build-output.txt` |
| Network payload < 2 KB per sync | **Met for every sync call** — check-in 135 B up / 0 B down; /sessions/start response 1.9 kB; /sessions/complete 0.6 kB; /compass score 1.4 kB. (One-time item-set fetch /compass/start is 5.8 kB — a fetch, not a sync.) | `latency-local.json`, `latency-prod.json` |
| End-to-end latency < 15 ms | **Not supported as written — but now sub-second, not 1–3 s.** After parallelizing reads + co-locating function and database (see below), deployed p50/p95: start **579/906 ms**; complete **715/1,553 ms**; check-in sync ~170 ms (client-RTT-bound). Decision logic alone is sub-10 µs (previously measured). Recommended framing: "decision logic executes in microseconds; full server round trips complete in ~0.6–0.7 s at p50 on free-tier infrastructure, with the highest-frequency call (the check-in sync) at ~170 ms — dominated by the client's own network RTT." | `latency-prod-dub1.json` |
| Lighthouse (mobile, **real deployed URL**) | **Session runtime page: Performance 82 · Accessibility 100 · Best Practices 100** (FCP 1.3 s, LCP 2.5 s, TBT 530 ms, CLS 0). **Landing: 96 / 100 / 100** (FCP 1.0 s, LCP 1.9 s, CLS 0). Earlier localhost run (89 / 72) is superseded: localhost flattered the session page (no real network) and *penalized* the landing page (memory-pressured local server vs. CDN-served prod). Accessibility 100 evidences the WCAG 2.1 AA commitments (44 px touch targets, colour-independent meaning, reduced-motion support). | `lighthouse-session-runtime-prod.json`, `lighthouse-landing-prod.json` |
| json-rules-engine in build | **Absent — confirmed** (not in package.json or lockfile). Contribution 2 must be reframed around the versioned JSON content architecture that IS built (see DEPENDENCIES.md note). | package.json |
| Phases 10–12 zero direct placements | **Confirmed structural, proven, documented** — P7/P9's unconditioned expressive predicates shadow the late-phase checks; reachable via ELSE by design. | `phase-10-12-reachability.md` |

## Latency optimization round (2026-09-05, second pass)

### Why: the call-sequence audit

Every `await` on a Supabase read is a full network round trip from the
function to the database's REST layer. The audit found most of them
independent of one another:

- **/api/sessions/start** made **6 sequential** round trips on the common
  path — `auth.getUser()`, RLS child read, content read, last-attempt read,
  latest-assessment read, insert. The first five key off the request body
  alone → collapsed into **one parallel batch + the insert = 2 round trips**
  (readiness-gated first sessions: 4, was 8).
- **/api/sessions/complete** made **~14 sequential** round trips on the
  common (non-advance) path. Now: batch A (auth ∥ instance ∥ check-ins),
  batch B (content ∥ history ∥ prior-approximations), phase-map, outcome
  update, age-bracket batch 1 (child ∥ window ∥ last-transition), age-bracket
  batch 2 (window check-ins ∥ cooldown count), and ONE merged instrumentation
  update (was two updates to the same row) = **7 round trips**.
- **Genuinely sequential, kept sequential:** the phase-map (needs history's
  session ids); the outcome update *before* the age-bracket evaluation (its
  window includes this session); `phase_history` *before*
  `children.current_phase_id` (the audit row must exist before the child
  moves); the graduation path's next-phase read.

### Effect isolation (same script, 10–12 cycles, p50/p95 ms)

| Configuration | start | complete | compass score |
|---|---|---|---|
| Baseline: sequential code, functions in iad1 | 1,239 / 2,746 | 2,219 / 3,061 | 1,668 |
| Fix 1 only — parallelized reads, still iad1 | 1,007 / 1,744 | 2,129 / 4,038 | 1,663 |
| Fix 1 + Fix 2 — parallelized + functions in dub1 | **579 / 906** | **715 / 1,553** | **657** |
| (Local `next start`, parallelized, for reference) | 647 / 1,254 | 1,450 / 2,562 | 1,660 |

Reading: **the owner's diagnosis was right that round trips dominate — but the
two costs multiply, so the region move was the bigger single lever in
production.** Each iad1↔eu-west call measured ~250 ms (worse than raw RTT —
per-call gateway/TLS overhead), so even 7 batched stages stayed >2 s;
co-locating in dub1 collapses per-call cost to milliseconds, at which point
the remaining ~0.6 s is mostly the *client's* RTT to the edge plus the
middleware auth refresh. Locally (per-call ~170 ms from the dev Mac),
parallelization alone gave −38% on both routes. The compass score route was
untouched by Fix 1 and improved only with Fix 2 — a clean control.
Unmeasured residue: Next.js middleware runs `auth.getUser()` (one Supabase
Auth call) before every API route; it executes near the *user*, not in dub1,
so it still pays a user↔eu-west leg. Raw data: `latency-prod.json` (baseline),
`latency-prod-parallel.json` (fix 1), `latency-prod-dub1.json` (fix 1+2),
`latency-local-parallel.json`.

## Low-bandwidth (LMIC) characterization — analytical

At Slow-3G profile (≈400 ms RTT, ≈50 kB/s): the recurring in-session traffic is
the check-in sync (135 B) → **RTT-bound, ≈0.5–1 s per sync**, well within a
30–60 s check-in interval; /sessions/start (1.9 kB) and /complete (0.6 kB)
remain server-time-bound. First page load is the heavy step: 199 kB JS ≈ 4 s
transfer, plus the phase illustration (served by Next image optimization at
mobile widths, decorative). A manual DevTools Slow-3G session run remains
recommended to capture the lived experience end-to-end.

## Remaining manual (browser-only) measurements

1. **Memory footprint** — DevTools Memory → heap snapshot mid-session (claim: <10 MB).
2. **Slow-3G lived session** — DevTools Network throttling, one full session.
3. **Cross-browser pass** — Chrome ✓ (Lighthouse), Firefox + Safari visual pass.

## §13.5 threshold-validation trigger — now computable

Every Age-Bracket evaluation persists gate outcomes to
`session_instances.age_gate_evaluation` (migration 023). The trigger query:

```sql
select count(distinct child_id) as children_evaluated,
       count(distinct child_id) filter (where (age_gate_evaluation->'gates'->>'g1Mean')::bool
         and (age_gate_evaluation->'gates'->>'g2TopTier')::bool
         and (age_gate_evaluation->'gates'->>'g3NoRetakes')::bool) as children_clearing_all_gates
from session_instances where age_gate_evaluation is not null;
```
