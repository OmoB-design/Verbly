# DEPENDENCIES.md

Third-party services, libraries, and vendor choices for Verbly. This file distinguishes **confirmed** decisions from **open** ones — do not treat anything in the "Not Yet Decided" section as settled just because a candidate is named.

---

## Confirmed

### Frontend: Next.js (React)

Chosen over a plain Vite/React SPA for three reasons specific to this project:
- **Supabase has an official SSR-safe auth helper (`@supabase/ssr`)** built for Next.js — it stores the session in httpOnly cookies rather than `localStorage`, which matters here specifically because a JWT sitting in `localStorage` is readable by any injected script (XSS risk), and this app handles Tier 1 data (child names, diagnosis notes, assessment responses).
- **The SLP dashboard is a genuinely better fit for a real webpage** — reports and progress history are exactly the kind of content an SLP is more likely to review at a desk than on a phone.
- **Server-rendered pages help the caregiver-facing accessibility requirements** in `DESIGN.md` (screen reader support, semantic structure) — standard HTML/ARIA on the web is a direct match for WCAG 2.1 AA.

### UI layer: Tailwind CSS + shadcn/ui

- **Tailwind CSS** for styling — utility-first, pairs directly with Next.js, no separate CSS architecture to maintain.
- **shadcn/ui** for the component layer (built on Radix UI primitives + Tailwind). Worth noting why this is a good fit beyond convenience: **Radix primitives ship with strong built-in accessibility** (focus management, keyboard navigation, ARIA roles) — this directly supports the `DESIGN.md` accessibility requirements (screen reader support, focus management on modals/celebration screens) essentially for free on the caregiver-facing side, rather than something to build from scratch.
- **Scope note:** shadcn/ui is the right tool for the caregiver-facing surface (forms, dashboards, session runtime chrome) — it is **not** a fit for the child-facing game screens (Bubble Pop, Nose Tap, etc.), which need custom Canvas/SVG work per `DESIGN.md`'s separate design pass for that surface. Don't reach for shadcn components there by default.

### Notifications: Email

Push notifications (native or Web Push) are **not** being used. Email is the sole notification channel, covering both types described in `ARCHITECTURE.md` — data-driven nudges (session reminders, milestone alerts, retake suggestions) and generic encouragement lines — subject to the same caregiver-controlled frequency setting (daily/weekly/off).

This sidesteps the Web Push/Safari-PWA-install limitation entirely, at the cost of being a less immediate channel than push would have been (an email is easier to miss than a phone notification) — worth keeping in mind if engagement data later suggests reminders aren't landing.

**Email provider — [Resend](https://resend.com) (confirmed).** Chosen for its first-class Next.js integration. Because it sends caregiver-identifying content (child's name, milestone details), it falls under the Tier 1 vendor-risk standard below — a signed DPA is required before real user data is sent, which for this project includes the SLP-supervised testing phase, not only a hypothetical launch.

### Backend platform: Supabase

Covers, as a single vendor:

| Supabase service | Used for |
|---|---|
| **Postgres** | Primary database — child profiles, session instances, phase history, Compass assessment records, curriculum content |
| **Auth** | Caregiver authentication, password reset (single-use, time-limited tokens) |
| **Storage** | Vocalization audio recordings — served only via signed, time-limited URLs, never a public file path |
| **Row-Level Security (Postgres RLS)** | Enforces that a caregiver can only query their own child(ren)'s data at the database layer, not just in application code |

**Why one vendor for all four:** it keeps the data-processing-agreement and compliance surface (see *Vendor Risk* below) to a single relationship for the highest-sensitivity data (Tier 1 — child names, diagnosis notes, audio, assessment responses, session performance), rather than spreading child data across separate auth/storage/DB vendors.

### Hosting: Vercel

Confirmed for the Next.js frontend/app. Natural fit given the framework is Next.js (same vendor), with first-class App Router support, Serverless/Edge functions for the server-authoritative logic in `API.md`, and preview deployments per branch. Supabase remains a separate vendor for data/auth/storage — Vercel hosts only the Next.js layer and holds no Tier 1 data at rest itself. Note, though, that Supabase and Resend secrets (service-role key, `RESEND_API_KEY`) live in Vercel's project environment settings, so Vercel is still inside the trust boundary for those credentials and its project access should be treated accordingly.

---

## Not Yet Decided

These need explicit decisions before `ARCHITECTURE.md` can be finalized. Candidates are listed where relevant, but naming a candidate here is not a decision — flag back to the user rather than silently committing to one while implementing.

| Area | Status | Notes |
|---|---|---|
| Analytics | Undecided | Must respect the Tier 1/2/3 data classification in the Security section below — Tier 3 (aggregate/anonymized) only, unless a specific vendor is vetted for higher tiers |
| Error monitoring / logging | Undecided | Same Tier 1 constraint applies — no raw child data or session content in third-party error logs |

---

## Vendor Risk

Every vendor added to this file — present or future — that touches **Tier 1 data** (child's name, diagnosis notes, audio recordings, assessment responses, session performance data) needs a signed Data Processing Agreement, and ideally SOC 2 compliance, before real user data is sent to it. This applies retroactively to Supabase and to Resend (the confirmed email provider, which sends caregiver-identifying content — child's name, milestone details) as much as to anything added later — verify DPA/compliance status during vendor selection, not after integration.

This project is very likely subject to **COPPA** (US, children's data) and **GDPR/UK-GDPR** (if any EU/UK users) regardless of business model, given it processes data about children under 13 and what could be considered special-category health data. This is not legal advice — a conversation with a lawyer familiar with child-directed digital products is worth having before any real-world data collection begins, which for this project includes the SLP-supervised testing phase, not just a hypothetical future launch.

---

## Open questions to resolve before this file is complete

- Whether analytics/error-monitoring are needed at all for a dissertation-scope build, or deferred until a post-dissertation phase
