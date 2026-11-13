# Verbly

**A full-stack, rules-based speech and language therapy workflow prototype for caregivers and speech-language pathologists.** Verbly explores how a structured curriculum, assessment, and session history can be implemented as an inspectable web application.

**Portfolio:** [omob.work](https://omob.work)

## What it does

- Guides a caregiver through an onboarding communication assessment
- Delivers structured, timed practice sessions from versioned curriculum content
- Scores completed sessions and applies explicit rules for retakes and progression
- Supports a read-oriented SLP workflow and records progression history

Verbly is a project prototype, not a medical device, diagnosis, or replacement for professional evaluation or care. Its content and thresholds require appropriate independent clinical review and validation before real-world clinical use.

## Engineering highlights

- **Server-authoritative decisions:** assessment scoring and progression outcomes are calculated on the server, not accepted from client-submitted scores.
- **Data isolation:** PostgreSQL Row-Level Security scopes family data; sensitive audio is served through time-limited signed URLs.
- **Testable decision logic:** scoring, placement, and progression rules are implemented as deterministic logic and tested separately from route/UI code.
- **Versioned content and auditability:** assessment/session records retain content versions, and phase changes are recorded with their causes.

## Important note about AI / ML

Verbly does **not** implement machine learning or reinforcement learning. “Reinforcement Loop” in this project refers to a deterministic, authored progression system. It can demonstrate backend engineering, data integrity, and decision-system design, but should not be described as an AI model or AI-powered product.

## Tech

Next.js · React · TypeScript · Tailwind CSS · Supabase/PostgreSQL · Row-Level Security · Vitest

## Local development

Requirements: Node.js 22+ (check the current project configuration for the exact version).

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Set up the required Supabase environment variables before using authenticated or database-backed features. Do not commit credentials. Available checks include:

```bash
npm test
npm run typecheck
```

## Project status

This is an evolving dissertation/project prototype. Features and implementation status can change; consult the code and project-state documentation rather than treating older audit snapshots as current guarantees. Clinical thresholds and content are not independently validated for clinical use.
