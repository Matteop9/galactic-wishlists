# Changelog

## 0.2.0 — 2026-11-03

Day-1 feedback release. Driven by a review of the first session's chat log.

- **Mobile layout no longer jumps.** The document is pinned and the app shell is sized to the visual viewport (`ViewportFix` + `.app-shell`), so the iOS keyboard shrinks the thread instead of scrolling the page; the tab bar hides while typing; the thread auto-follows only while you're already at the bottom (`scrollTo` on the message container, never `scrollIntoView` on the page); `interactive-widget=resizes-content` for Android.
- **Set pad.** A tap-to-log widget above the composer whenever a workout is active: exercise picker, kg/reps steppers, RIR chips, warm-up/working/drop, L/R for unilateral moves, "Next exercise", "Finish session". Logs with no model call and shows the usual set card. Driven by the new `current_exercise_id` on `workouts`.
- **`start_exercise` tool + card.** The coach calls it when the exercise changes; it opens the pad and shows prescription, last session's top set and today's aim. Shorthand ("60x10", "same", "+2.5") now logs against the *current* exercise, not whichever one was logged last — the cause of day 1's "9x9 went onto shoulder press". A bare number is no longer fast-pathed when the coach just asked a question.
- **Pre-session check-in.** Header "▸ start" opens an energy / time / niggles sheet that becomes the first message; `start_workout` stores it on the workout (`checkin`), returns per-exercise `estimatedMin`, and the coach trims to the time available. Coach is told to use `ask()` when it lacks the check-in.
- **`ask` tool + card.** Generic tap-to-answer form (scale / choice / number / minutes / text) for any "couple of data points" question; answers return as a plain user message.
- **Delete is no longer next to Send.** Set-card delete moved to the far left, needs a second tap within 5 s, and "Set removed" offers Undo (restores the set).
- **Session RPE** is collected by chips on the summary card instead of a question.
- **Day 1 bugs:** working-set numbering excludes warm-ups (`setNumber` + `warmups`); summary top set excludes warm-ups; duration and "min in" run from the first logged set, not from `start_workout`; `undo_last_set` is atomic and refuses a second parallel call; new `delete_set` and `edit_workout` (fix duration / RPE / notes on a finished session); unilateral sets count for both sides unless L/R given.
- **History window.** The thread never resets; the model now sees the last 40 messages with older read-only tool outputs omitted, big outputs truncated, provider noise stripped and dangling tool calls closed (`src/lib/history.ts`, tested). The UI shows the last 60 with day dividers.
- Coach text renders light markdown (bold, bullets, numbered lists).

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
