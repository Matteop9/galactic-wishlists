# SkyDex ✈️

**The spotter's real, verified logbook of the sky.** Photograph a plane you can
actually see, SkyDex verifies you genuinely saw it against live flight data, and
it becomes a card in your scrapbook — stamped with the real flight details and
graded by rarity.

Live at **https://skydex-two.vercel.app**

## How it works

1. **Open** — see live aircraft in range around you (radius + altitude cone).
2. **Aim** — point the camera; the reticle lights up when a real flight lines up.
3. **Capture** — the photo, your GPS position, compass heading and device pitch
   are checked server-side against the live flight snapshot.
4. **Collect** — a verified sighting becomes a card: registration, type, carrier,
   route, altitude, flight phase, rarity tier (Common → Legendary), special
   liveries, wet-lease detection.
5. **Compete** — books (types / carriers / departures / destinations), a global
   feed with comments + reactions, leaderboards, and shareable card pages.

## Stack

- **Next.js 16** (App Router, `proxy.ts` middleware) + React 19 + Tailwind 4
- **Supabase** — Postgres (RLS), magic-link auth, photo storage
- **Live positions:** adsb.lol → adsb.fi → airplanes.live failover chain (transient — never persisted)
- **Persisted card data:** Flightradar24 API (routes, operator, flight state)
  + curated license-clean static maps for type names, airports, airlines,
  special liveries
- **MapLibre GL** for the situational map view
- Deployed on **Vercel** (lhr1)

## Development

```bash
npm install
npm run dev
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `FR24_API_TOKEN` (optional — captures
degrade gracefully without it).

See [SPEC.md](SPEC.md) for the product spec and [CHANGELOG.md](CHANGELOG.md)
for the release history.
