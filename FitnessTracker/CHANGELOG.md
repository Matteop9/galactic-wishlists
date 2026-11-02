# Changelog

## 0.1.0 — 2026-11-02

First build.

- Chat-first app: one thread, generative cards (set, plan, summary, cardio, weight, chart, programme change), voice input, offline outbox, auto rest timer with vibration.
- Coach agent (AI SDK 7 ToolLoopAgent on Vercel AI Gateway) with 30+ tools covering workouts, cardio, body metrics, daily check-ins, programme ownership (templates, rotation, targets, deloads, cardio plan, goal), durable memory and analysis (weekly stats, volume by muscle, e1RM history, correlations, charts).
- Gym-floor fast path: terse shorthand ("60x10 @1", "same", "+2.5") logged locally with no model call; short in-workout messages routed to Haiku, everything else to Sonnet.
- Pure, unit-tested logic: RIR-adjusted Epley e1RM, double progression, fractional set counting, PR detection, plate calculator, gap-aware EWMA trend weight, Pearson/Spearman with sample-size gating, quick-parse grammar, HAE payload parsing.
- Neon Postgres via Drizzle; 55-exercise Nippard-style library + reference PPL A/B seeded; programme itself is built by the coach during onboarding.
- Health Auto Export ingest (`/api/ingest/hae`, idempotent, kg/km/kcal normalised, London dates).
- Scheduled runs: morning brief + Sunday weekly review with autonomous programme edits, appended to the chat thread.
- Progress, Programme (with change log) and Settings (memory viewer, HAE setup, CSV export) pages.
- Single-user passcode auth; PWA manifest + icon.
- Verified end to end against AI Gateway (Sonnet 5.5 / Haiku 5.5): onboarding built the 6-template programme in one turn; sets logged by chat; weekly review ran and set target weights with reasons. Fixed duplicate set positions when the model logs several sets in parallel tool calls.
