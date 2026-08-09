# CONTRIBUTING.md

How to propose and review changes to Verbly. This project has two fundamentally different kinds of changes — **code** and **clinical content** — and they go through different review paths. Conflating them is exactly the failure mode this file exists to prevent (see `CLAUDE.md` → *Content vs. code boundary*).

---

## Before You Start

Read, in this order: `README.md` (what Verbly is), `CLAUDE.md` (locked decisions and conventions — do not silently relitigate anything in its decisions table), `ARCHITECTURE.md`, `DATABASE.md`, `API.md` if your change touches the engine, `PHASES.md`/the Compass blueprint if it touches clinical content.

---

## Two Kinds of Changes

### 1. Code changes (engine, UI, infrastructure)

Normal git workflow: branch → change → PR → review → merge.

- If a change touches `session_instances`, `phase_history`, or anything in the scoring/advancement path, the PR description must state which of `API.md`'s two access patterns (direct query vs. Edge Function) it belongs to, and why — per the rule that only server-authoritative functions decide outcomes.
- If a change touches accessibility-relevant UI (the live check-in component, the summary/retake screens), check it against `DESIGN.md`'s concrete requirements (touch target size, color redundancy, `prefers-reduced-motion`) before requesting review, not as an afterthought pass.
- Do not introduce ML vocabulary or ML-shaped abstractions into the RL engine's code, per `CLAUDE.md`'s single most important rule.

### 2. Clinical content changes (curriculum sessions, Compass item bank/weights/thresholds)

This is **not** a normal code change, even though it's stored as structured data. It requires:

1. **A version bump.** Every edit to a curriculum session's `content_json` or the Compass's `compass_content` bumps `content_version`/`schema_version` (see `DATABASE.md`). Never edit content in place without bumping the version — existing `session_instances`/`assessments` rows must keep referencing the version they actually ran under.
2. **A clinical review, not just a code review.** Changes to scoring thresholds, phase entry conditions, Compass domain weights (§5.2/§6.1), the pass mark, or any session's activity steps or RL behavior script should be reviewed by someone with clinical grounding in the method (ideally one of the SLPs already involved in the project) before merging — a code reviewer checking that JSON is well-formed is not the same review as someone checking that a change is still clinically sound.
3. **A changelog entry** stating what changed and why, tied to the version bump — this is what makes "this child's Phase 4 retake was scored under content v3" a traceable, answerable question later, not just a theoretical guarantee.

**Do not silently "improve" clinical wording while implementing an unrelated feature.** If content looks inconsistent or incomplete while you're working on something else, flag it as a separate, explicit content-change proposal — don't fold it into an unrelated PR.

---

## Reviewing Ambiguity

If a proposed change conflicts with something in `CLAUDE.md`'s locked-decisions table (e.g. someone proposes a digital sentence strip for PECS Phase 4, or multi-device sync for dual-caregiver sessions), the correct response is to **flag the conflict explicitly to the project owner**, not to silently implement the more conventional pattern instead. These decisions were made deliberately, sometimes against the more typical approach — a reviewer's job is to catch drift back toward the typical, not wave it through because it looks more familiar.

---

## Testing Expectations

- Any change to the advancement/scoring logic (`AdvancementDecisionEngine`) needs test cases covering all three outcomes (advance / retake / simplify) for at least one phase using the standard categorized model, since all 12 phases now share it.
- Any change touching `phase_history` should include a test confirming the correct `trigger_reason` is written — this table is the project's single audit trail, and a wrong or missing reason silently breaks traceability rather than throwing an error.
- Deletion-cascade changes must be tested against the full chain (`children` → `session_instances` → extension tables → `phase_history` → `assessments` → Storage objects) — a partial cascade is a silent data-integrity bug, not a crash, so it won't be caught by casual manual testing.

---

## Project Status Note

This is currently a single-developer, dissertation-timeline project with a small number of SLPs providing clinical input and conducting testing — not an open-source project accepting external contributions. This file is written for that reality (you, reviewing your own content changes with an SLP; you, being the one person who needs to remember not to relitigate a locked decision six weeks from now) as much as for any future collaborator.
