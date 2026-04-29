\# Wellbeing Buddy



A personal wellbeing + workout recommendation app for me, with the option 

to add friends/family later. Two goals:

1\. General wellbeing tracking (sleep, mood, energy, food, habits)

2\. Daily activity recommendations (gym/walk/sauna/rest based on readiness)



\## Stack



\- \*\*Frontend:\*\* Next.js 15 (App Router), Tailwind, shadcn/ui, deployed to Vercel

\- \*\*PWA:\*\* installable on iOS, push notifications via web push

\- \*\*Backend:\*\* Supabase (Postgres + Auth + RLS)

\- \*\*Webhook + cron:\*\* Cloudflare Worker (Wrangler), receives Health Auto Export

\- \*\*AI:\*\* Anthropic API, model `claude-sonnet-4-5`

\- \*\*Monorepo:\*\* pnpm workspaces — `apps/web`, `apps/worker`, `packages/shared`



\## Daily loop



Evening check-in → Claude generates provisional plan for tomorrow → user 

reacts → stored.



Morning check-in (sleep auto-filled, energy/soreness/gym access/time/note) 

→ chat screen pre-loaded with Claude's opener referencing last night's 

plan + this morning's state → conversational refinement → user locks plan.



Next evening: log what actually happened, generate tomorrow's preview, repeat.



\## Tone for Claude prompts



Knowledgeable friend, not a coach or therapist. Concise, warm, dry humour OK. 

No exclamation marks. No hype. If rest is right, say rest. British English.



\## Schema (high level — full migrations in supabase/migrations)



\- `users` — Supabase auth + profile

\- `user\_preferences` — gym/home/outdoor access, equipment, favourites, things to avoid

\- `health\_metrics` — raw HealthKit data from Health Auto Export, daily granularity

\- `daily\_checkins` — morning + evening fields, one row per day

\- `daily\_plans` — provisional\_plan, morning\_conversation (jsonb), final\_plan, actual\_activity

\- `insights` — weekly Claude-generated summaries



RLS on everything: users can only read/write their own rows.



\## Phases



\*\*Phase 1 (build first):\*\* schema, Health Auto Export webhook, morning + 

evening check-ins, evening preview generation, morning conversational flow, 

basic dashboard.



\*\*Phase 2:\*\* weekly insights, smart nudges, recommendation accuracy tracking.



\*\*Phase 3:\*\* multi-user friend/family with shared streaks, no shared raw data.



\## Conventions



\- TypeScript everywhere, strict mode

\- Server components by default, client components only when needed

\- Zod for all API input validation

\- Use `claude-sonnet-4-5` as the model string

\- All measurements in metric (the user prefers grams, km, kg, °C)

\- All times in Europe/London

\- Don't add filler comments or excessive prose — clean code only

