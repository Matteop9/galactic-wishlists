# Coach — agentic gym, cardio and weight tracker

One chat thread is the whole app. You talk (or type gym-floor shorthand), the coach logs it through tools, renders cards, owns your programme and reviews your week on a schedule.

- **Lifting**: Nippard-style lengthened-biased Push/Pull/Legs with abs last, rotating A/B over 3 days a week. Double progression, RIR on every set, lengthened partials / myo-reps / drop sets as first-class set types, e1RM + PR detection, weekly fractional sets per muscle.
- **Cardio**: logged from the machine readout (no watch needed); progress = speed/level at a given RPE.
- **Weight**: Renpho → Apple Health → Health Auto Export → `/api/ingest/hae`. Trend weight is a gap-aware EWMA (α 0.1); the app never talks in single readings.
- **Scheduled agent runs**: morning brief (07:00 London) and Sunday weekly review that adjusts next week's programme on its own and explains every change.

## Stack

Next.js 16 (App Router, Cache Components) · Neon Postgres via Vercel Marketplace + Drizzle · AI SDK 7 `ToolLoopAgent` on Vercel AI Gateway (Claude Sonnet 5.5 for coaching, Haiku 5.5 for gym-floor turns; set `ANTHROPIC_API_KEY` to bypass the gateway) · Recharts · single-user passcode auth (bcrypt + jose) · installable PWA.

## Local dev

```bash
npm install
vercel link && vercel env pull .env.local     # DATABASE_URL etc.
npm run passcode -- "your passcode"           # → PASSCODE_HASH=b64:...
# add AUTH_SECRET, HAE_TOKEN, CRON_SECRET (any random strings) and AI_GATEWAY_API_KEY to .env.local
npm run db:push && npm run db:seed            # schema + exercise library
npm run dev
```

`npm test` runs the pure-logic suites (training maths, trend, stats, quick-parse grammar, HAE parsing).

## Layout

```
src/agent/        system prompt + ToolLoopAgent + tools (workout, cardio, body, programme, memory, analysis)
src/lib/          pure logic (training, trend, stats, quickparse, hae) + server queries
src/app/api/chat  streaming chat route (history persisted in Postgres)
src/app/api/ingest/hae   Health Auto Export webhook (header x-hae-token)
src/app/api/cron/*       morning-brief, weekly-review (Vercel Cron, Bearer CRON_SECRET)
src/app/actions.ts       gym-floor fast path: "60x10 @1" is logged with no model call
src/components/cards     generative UI cards rendered from tool results
```

## Deploy

`vercel deploy --prod` from this folder. Env vars live on the Vercel project (Neon integration injects `DATABASE_URL`; add the rest from `.env.example`). Crons are declared in `vercel.ts`.
