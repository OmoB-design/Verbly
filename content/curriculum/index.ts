import type { PhaseSeed } from "./types";
import { PHASE_01 } from "./phase-01-joint-attention";
import { PHASE_02 } from "./phase-02-imitation";
import { PHASE_03 } from "./phase-03-oral-motor";
import { PHASE_04 } from "./phase-04-pecs1-how-to-communicate";
import { PHASE_05 } from "./phase-05-pecs2-distance-persistence";
import { PHASE_06 } from "./phase-06-pecs3-picture-discrimination";
import { PHASE_07 } from "./phase-07-pecs4-sentence-structure";
import { PHASE_08 } from "./phase-08-pecs5-responsive-requesting";
import { PHASE_09 } from "./phase-09-pecs6-commenting";
import { PHASE_10 } from "./phase-10-turn-taking";
import { PHASE_11 } from "./phase-11-functional-communication";
import { PHASE_12 } from "./phase-12-vocal-approximation";

/** All transcribed phases, in order (CLAUDE.md content governance: reviewed
 *  like code before seeding; per-phase flags live in each file's header). */
export const ALL_PHASES: PhaseSeed[] = [
  PHASE_01,
  PHASE_02,
  PHASE_03,
  PHASE_04,
  PHASE_05,
  PHASE_06,
  PHASE_07,
  PHASE_08,
  PHASE_09,
  PHASE_10,
  PHASE_11,
  PHASE_12,
];
