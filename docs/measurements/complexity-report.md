# Cyclomatic complexity — deterministic engines

Tool: ESLint `complexity` rule (threshold 0 so every function is reported), run over
`lib/engine/*.ts`, `lib/compass/*.ts`, `lib/readiness/*.ts` (tests excluded).

- Functions analysed: **64**
- Median M: **2.0** · mean: 4.2 · max: 24
- Meeting M ≤ 5: **48/64** (75%)

## Functions above M = 5 (honest accounting)

| M | Function | File | Note |
|---|---|---|---|
| 24 | `runAgeBracketEvaluation` | lib/engine/age-bracket-runtime.ts | DB assembly/orchestration, not decision logic; the pure rule it calls is M=8 |
| 19 | `mapPhase` | lib/compass/phase-mapper.ts | §6.2 decision tree transcribed 1:1 — twelve sequential clinical predicates; decomposing would obscure blueprint correspondence |
| 19 | `isVariant` | lib/engine/session-script.ts | runtime schema validator (one check per content field) |
| 10 | `calculateProgressionState` | lib/engine/progression.ts | trailing-run scan shared by UI + server |
| 10 | `applyBonus` | lib/engine/scoring.ts | three bonus kinds × guard clauses (Scoring Appendix §3) |
| 9 | `benchmarkAgreement` | lib/compass/scoring.ts | §5.4 near-miss banding |
| 9 | `parseSessionScript` | lib/engine/session-script.ts | runtime schema validator |
| 8 | `detectRedFlags` | lib/compass/red-flags.ts | §7 class/bracket filtering |
| 8 | `decideAdvancement` | lib/engine/advancement.ts | the locked pass/retake/simplify rule incl. the simplified-graduation ruling |
| 8 | `evaluateAgeBracketTransition` | lib/engine/age-bracket.ts | three gates + cooldown + floor (§13.5) |
| 8 | `rollingBaselineStep` | lib/engine/scoring.ts |  |
| 7 | `computeOralMotorFlags` | lib/compass/red-flags.ts |  |
| 7 | `computeDomainScores` | lib/compass/scoring.ts |  |
| 7 | `isOption` | lib/engine/session-script.ts |  |
| 7 | `scoreReadiness` | lib/readiness/score.ts |  |
| 6 | `assess` | lib/compass/assess.ts |  |

## Full distribution

| M | Count |
|---|---|
| 1 | 19 |
| 2 | 15 |
| 3 | 8 |
| 4 | 3 |
| 5 | 3 |
| 6 | 1 |
| 7 | 4 |
| 8 | 4 |
| 9 | 2 |
| 10 | 2 |
| 19 | 2 |
| 24 | 1 |
