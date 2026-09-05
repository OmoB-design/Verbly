# Phase 10–12 direct-placement reachability — investigation (evaluation item 18)

**Finding under investigation:** across 400,000 synthetic profiles (two independent
seeds), Phases 10, 11 and 12 received zero *direct* placements from the Compass
decision tree — all placements into those phases arrived via the ELSE fallback.

**Verdict: confirmed as a structural property of the blueprint's §6.2 predicate
ordering, faithfully transcribed by `lib/compass/phase-mapper.ts` (`mapPhase`).
Not an implementation defect.** Proof below; the three phases remain reachable
via the ELSE (nearest-driver) branch, whose candidate list includes 10, 11, 12.

## Proof of shadowing

Thresholds (compass_content v2.1.0): `expressiveP7 = [35, 55]`,
`expressiveP9Min = 55`, `socialP10Min = 60`, `expressiveP10Min = 45`,
`functionalP11Min = 65`, `expressiveP11Min = 55`, `speechP12Max = 40`,
`otherDomainsMinForP12 = 55`. The tree is evaluated strictly in order
P3-flag, P1, P2, P4, P5, P6, **P7, P8, P9**, P10, P11, P12, ELSE.

- **Phase 11** requires `expressive ≥ 55`. Every profile with `expressive ≥ 55`
  is already captured by the earlier, *unconditioned* Phase 9 check
  (`expressive ≥ 55`). ∎ Direct P11 is unreachable.
- **Phase 12** requires all non-speech domains ≥ 55 — including
  `expressive ≥ 55` → captured by Phase 9 first. ∎ Direct P12 is unreachable.
- **Phase 10** requires `social ≥ 60 ∧ expressive ≥ 45`. To fall past Phase 9,
  `expressive < 55`, so `expressive ∈ [45, 55)`. But the earlier Phase 7 check
  fires on `expressive ∈ [35, 55]` with **no other condition**, capturing that
  entire window. The only remaining route (`expressive < 35`) fails Phase 10's
  own `expressive ≥ 45`. ∎ Direct P10 is unreachable.

The joint cause is two *unconditioned* expressive-language predicates (P7's band
and P9's floor) partitioning the expressive axis at 35/55 ahead of the late-phase
checks. This originates in the blueprint's §6.2 simplified text tree (the §6.1
table mentions qualifiers like "single words present" and "spontaneous
requesting present" that the §6.2 tree does not encode as extra conditions);
the implementation matches §6.2 exactly, which §13 designates as authoritative.

## Interpretation for the dissertation

Late-stage phases 10–12 describe children with substantially developed skills —
profiles a screening instrument for children *with communication difficulties*
rarely needs to place directly at intake. The ELSE branch (nearest driver
distance, ties to the lower phase) remains their entry path, and the caregiver
override provides a further corrective. The zero-direct-placement result is
therefore documentable as **intentional-by-ordering**, with this proof as the
explanation. Any re-ordering or tightening of the §6.2 predicates (e.g. adding
the §6.1 qualifiers as explicit conditions) is a clinical change to versioned
content requiring a schema-version bump and owner sign-off — deliberately not
made as part of this investigation.
