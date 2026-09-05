# Verbly — engineering measurements (evaluation work order, 2026-09-05)

Tool-generated results for the dissertation's engineering claims. Environment:
app deployed on Vercel (functions: iad1) + Supabase Postgres (eu-west);
local runs on the development Mac against the same hosted database. All
latency figures are full HTTP round trips including database work — *not*
decision-logic-only timings.

## Claim-by-claim verdicts

| Claim | Verdict | Evidence |
|---|---|---|
| Cyclomatic complexity M ≤ 5 | **Partially met — median M = 2; 48/64 functions ≤ 5** | `complexity-report.md` (every exception annotated; the largest, `mapPhase` M=19, is the §6.2 tree's twelve clinical predicates transcribed 1:1) |
| Client-side JS bundle | **Measured** — session runtime route 78.5 kB (route) / **199 kB first-load**; 102 kB shared baseline | `next-build-output.txt` |
| Network payload < 2 KB per sync | **Met for every sync call** — check-in 135 B up / 0 B down; /sessions/start response 1.9 kB; /sessions/complete 0.6 kB; /compass score 1.4 kB. (One-time item-set fetch /compass/start is 5.8 kB — a fetch, not a sync.) | `latency-local.json`, `latency-prod.json` |
| End-to-end latency < 15 ms | **Not supported — restate the claim.** Deployed p50/p95: start 1,239/2,746 ms; complete 2,219/3,061 ms; check-in sync 164 ms. Decision logic alone is sub-10 µs (previously measured), but each route makes 5–10 sequential Supabase REST calls, and Vercel(iad1)↔Supabase(eu-west) adds cross-region legs. Recommended framing: "decision logic executes in microseconds; full server round trips complete in 1–3 s on free-tier, cross-region infrastructure, with the highest-frequency call (the check-in sync) at ~160 ms." | `latency-prod.json` |
| Lighthouse (mobile) | **Session runtime page: Performance 89 · Accessibility 100 · Best Practices 100** (FCP 0.9 s, LCP 2.7 s, TBT 320 ms, CLS 0). Landing: 72 / 100 / 100. Accessibility 100 evidences the WCAG 2.1 AA commitments (44 px touch targets, colour-independent meaning, reduced-motion support). | `lighthouse-session-runtime.json`, `lighthouse-landing.json` |
| json-rules-engine in build | **Absent — confirmed** (not in package.json or lockfile). Contribution 2 must be reframed around the versioned JSON content architecture that IS built (see DEPENDENCIES.md note). | package.json |
| Phases 10–12 zero direct placements | **Confirmed structural, proven, documented** — P7/P9's unconditioned expressive predicates shadow the late-phase checks; reachable via ELSE by design. | `phase-10-12-reachability.md` |

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
