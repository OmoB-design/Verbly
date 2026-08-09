# DESIGN.md

The design system and UX principles for Verbly. This governs visual language, tone, accessibility, and interaction patterns — not data architecture (see `ARCHITECTURE.md`/`DATABASE.md`) and not clinical content (see `PHASES.md`).

---

## Design philosophy

Verbly asks a tired, possibly stressed caregiver to run a clinically precise procedure with their child, often one-handed, often after a long day. The design's job is to make that feel calm and doable, never like a test the child (or the caregiver) can fail.

Two principles run through every screen:

1. **Pressure-free tone.** A session that goes badly is information, not failure. Summary screens speak in encouragement ("Nice work today") rather than bare metrics. This tone must hold up under a *bad* score, not just a good one — a 40% session needs its own considered copy, not a lower-enthusiasm version of the 83% copy.
2. **Two different people are looking at this screen.** Most of the app is caregiver-facing. A small number of screens (the in-session games in Phase 3's Oral Motor work and similar) are also child-facing. These are not the same design problem and should not share a component library unmodified — see *Child-Facing Screens* below.

---

## Two Design Surfaces

### Caregiver-facing (the majority of the app)

Designed for: a sleep-deprived, possibly one-handed adult, often mid-task with the child. Calm, uncluttered, high information density kept low even when the underlying data isn't. **Web-specific:** must work across a much wider viewport range than a mobile app would — phone browser, tablet, and desktop/laptop (the last of these especially likely for the SLP dashboard). Design mobile-first, but do not assume the phone is the only real target the way the original mobile-app framing did.

### Child-facing (in-session games only)

Designed for: children with limited fine motor control, attention differences, and sensory sensitivities. Large, high-contrast, simple shapes. This is a genuinely separate design pass, not a reskin of the caregiver component library — a button sized and styled for an adult's precise tap is often wrong for a child's. **Web-specific:** these screens (Bubble Pop, Nose Tap, and similar) should be built with a web-native animation approach (CSS/SVG or Canvas) rather than assuming a native-mobile gesture/animation library — touch and pointer events both need to work, since the device could be a tablet or a touchscreen laptop, not only a phone.

---

## Accessibility Requirements

These are concrete build requirements, not general best-practice reminders — treat every line below as testable.

- **Color is never the only signal.** The live session check-in buttons (spontaneous / prompted / no-response) must carry icon or text redundancy alongside color (e.g. a checkmark, a half-fill icon, an X) — roughly 1 in 12 men are color-blind, and this is a live-session control, not a decorative element.
- **Touch targets ≥ 44×44px minimum**, larger on the active-session screen specifically, since one-handed operation while managing a child is the norm for this product, not the edge case.
- **Text scaling respects OS-level settings.** Do not fix text size in pixels. Caregivers of children with disabilities skew toward needing this more than the general population.
- **Screen reader support (WCAG 2.1 AA)** on all caregiver-facing flows: proper heading structure, ARIA labels on icon-only buttons, explicit focus management on modal and celebration screens.
- **Respect `prefers-reduced-motion`.** Celebration/milestone animations must check this before firing.
- **Audio content needs a non-audio fallback.** The vocalization log/playback feature is audio-first by nature; surrounding UI (labels, timestamps, context tags) must carry enough information that the feature stays usable without audio — for a caregiver with hearing loss, or in a setting where audio can't play.

Budget real design and engineering time for this, particularly reduced-motion and screen-reader work — retrofitting accessibility after the component library exists is more expensive than designing it in from the start.

---

## Interaction Patterns

### Live session check-in

The repeating "did the child respond spontaneously / with a prompt / not at all" check-in is the single most-reused pattern in the app (it appears across nearly every phase, with varying option counts and interval timing). Design it as **one configurable component** — variable number of options, variable interval — not as one-off screens per session. See `ARCHITECTURE.md` for why the underlying data model needs the same flexibility.

### Retake / Simplify tone

Every phase now has a Simplified Session as a fallback (see `PHASES.md`). The retake/simplify decision screen should never read as a downgrade — frame it as "let's try a version built for right where [child] is today," consistent with the pressure-free philosophy above. This screen's copy should be reviewed with the same care as the summary screen's, since it's shown at the exact moment a caregiver might feel discouraged.

### Compass results screen

Per the Compass's own §0 "screening not diagnosis" guardrail: the results/placement screen leads with strengths, uses a warm non-clinical tone, and visually separates any red-flag/referral messaging from the main results — a red flag should never read as attached to, or embedded within, the score itself.

### The physical sentence strip (PECS Phase 4)

Per the locked decision to keep this physical: the app's role on this screen is narration, timing, and scoring — not rendering a digital sentence strip. Design this screen around *supporting* an offline physical action (clear step-by-step prompts, a "mark this trial" control) rather than trying to simulate the exchange on-screen.

### Single-device, second-person instructions

Where a session needs a second person present (a physical prompter, a second communication partner), the screen must clearly separate "instructions for you, the caregiver holding this device" from "instructions to read aloud or relay to the second person" — these should be visually distinct blocks, not blended into one paragraph, since the caregiver may need to relay the second person's instructions verbally without re-reading their own.

---

## Motion & Celebration

Milestone and celebration moments (first spontaneous request, phase completion, etc.) are a real part of the pressure-free philosophy — but must always check `prefers-reduced-motion` first, and should never be the only signal of success (pair with clear text, not just animation), consistent with the accessibility requirements above.

---

## Open design questions

Not yet resolved — flag rather than guess if these come up during implementation:

- Exact visual treatment for the "second person" instruction block described above (inline card vs. separate screen state).
- Whether the live check-in component's icon set (for color-blind redundancy) is standardized once now or designed per-phase as sessions are built.
