# SkyDex — Changelog

> **Releases:** user-facing version log lives in `lib/releases.ts` and renders on the home screen. On every published release, bump `CURRENT_VERSION`, prepend a `RELEASES` entry, and mirror it here. Versioning is **semantic MAJOR.MINOR.PATCH** (patch = feature/fix in-phase; minor = phase milestone e.g. 0.3.0 native app; major = public launch). Early `v0.10x` entries below were renumbered to `0.1.x`.

## Unreleased

Profile page overhaul (feedback 2026-07-17): easier favourite pinning + full history loads.

### Added
- **Full history now loads on profiles.** The page previously hard-capped at the 60 most recent sightings with no way to see older ones. It now loads 24 up front and a **Load more (N remaining)** button pages through everything via a new `loadMoreSightings` server action (`app/profile/actions.ts`), with a "showing X of Y" counter in the section header (Y from an exact count on `feed_sightings`). Shared query/mapper logic extracted to `lib/profileSightings.ts` (used by both the page and the action).

### Changed
- **Pinning favourites is now instant and obvious** (`components/ProfileSightings.tsx` rewrite). The tiny ☆ overlay (which overlapped the VERIFIED stamp, popped `alert()`s, and forced a full `router.refresh()` per tap) is replaced by a full-width **"☆ Pin to profile" / "★ Pinned — tap to unpin"** button under every card. Pins update optimistically — the Favourites tray at the top reflects the change immediately, no page reload — and revert with an inline toast if the server rejects. The tray shows a **n/3 pinned** counter, lets owners unpin directly from it (previously read-only, so you had to hunt for the starred card in history), and shows a hint box when empty. The component now owns Favourites + history in one client island (medals/stats render between as children) so both stay in sync.

## v0.3.6 — 2026-07-17

Community-review thresholds tightened (feedback 2026-07-17) + map key relocation/legibility (feedback 2026-07-12).

### Changed
- **Flag threshold lowered to net-2** (migration `review_net2_flag_and_endorse_retire`): `review_vote` now flags a photo into the admin queue when `no − yes ≥ 2` (was 3). Retroactively backfilled — the 9 photos already sitting at net-2 were flagged, hidden from public surfaces, and given owner warnings, joining the `/reports` admin queue.
- **Endorse-retire at net-2**: `review_next` no longer serves photos with `yes − no ≥ 2` — the community has approved them, so reviewer effort goes only to photos that still need eyes (91 photos retired at migration time). They can still be flagged later only if already-cast votes shift, and admin `cleared` immunity is unchanged.
- Copy/comments updated (`app/review/page.tsx` subtitle, `ReviewQueue.tsx`, `app/reports/page.tsx`).

- **Spot-map key moved to the top-right** (`components/SpotMap.tsx`) — it was stacked under the zoom buttons (both were top-left). Nothing else occupies the map's top-right in map view (tracking banners are camera-only; Recenter is bottom-right).
- **Key swatches are now the real marker glyphs**: each row renders the actual filled narrowbody SVG (with the paper outline the map markers carry) instead of a thin ✈ text character, fixing the "thin colours against the black background" complaint. The special-livery row shows the dashed brass ring as drawn. Added an "already collected" (ink) row so all three newness grades are keyed; slightly larger text (11px) and a slightly more opaque backing panel.

### Notes
- Thresholds are deliberately tight for the current 3-reviewer userbase; **scaling them back up (and revisiting the daily cap + 5-sighting standing) as more users join is on the backlog** (feedback row logged 2026-07-17).

## v0.3.5 — 2026-07-12

Centre Spot button + community photo review (feedback 2026-07-12).

### Added
- **Community photo review.** New `/review` page (linked from Settings): signed-in spotters are served random, anonymous photos from other users and answer one question — can you see an aircraft? All trust logic lives in SECURITY DEFINER RPCs (migration `community_photo_review`):
  - `review_next()` — server-side random assignment (reviewers can't choose or identify targets, never see the same photo twice, own photos excluded).
  - `review_vote(p_sighting, p_can_see)` — enforces reviewer standing (≥5 verified sightings), a 100-votes/24h cap, one vote per user per photo (PK), and the **net-3 rule**: a photo is flagged only when `no − yes ≥ 3`, so honest yes-votes cancel a brigade.
  - At net-3: `sightings.review_status = 'flagged'` → the photo disappears from every public surface (`feed_sightings` view now filters flagged/removed; feed, profiles, share pages all read it), the owner gets a `photo_warnings` row, and the sighting joins the admin queue. **The community can only hide — nothing is deleted or unverified without an admin.**
  - `resolve_photo_flag(p_sighting, p_approve)` (admin-only): approve → `removed` + `verified = false` (drops off leaderboards too), warning upheld; reject → `cleared` (restored and permanently immune from re-flagging), warning withdrawn.
  - Owner warning banner on the Scrapbook ("Please make sure you can see the plane in your picture"), distinguishing pending flags from upheld removals.
  - Admin queue on `/reports`: flagged photo, vote tally, owner, Approve removal / Reject–restore buttons (`resolvePhotoFlag` server action).
  - New tables `photo_reviews`, `photo_warnings` (RLS: own/admin read only; writes only via RPCs).
- **Centre Spot button** (`components/MobileTabBar.tsx`): tab order is now Scrapbook · Feed · **SPOT** · Boards · Profile, with Spot as a raised 56 px teal circle (stamp-red when active) breaking the bar line — the unmissable primary action. `/review` lights the Profile tab.

## v0.3.4 — 2026-07-12

Map newness colouring, round 2 (user feedback on v0.3.3's single-dimension gold).

### Changed
- **Marker colour is now graded across every dimension knowable pre-capture** (`app/spot/page.tsx` `newness()` + `components/SpotMap.tsx`): **gold** = all of type / airline / special livery are new for the viewer; **green** (`#3e7a5a`, mirrors `--color-rarity-uncommon`) = at least one is; **ink** = complete dupe; tracking red still wins. Airline is derived client-side via `airlineFromCallsign`; livery via `specialLivery(registration)`. Unknowable dimensions don't count against gold. **Airports deliberately excluded** — routes only become known at capture time via FR24 (the live feed has no origin/destination, and pre-fetching routes for a mapful of planes would burn ~9 credits each).
- **Special-livery airframes get a dashed brass ring** around their marker (CSS outline, rotation-safe), and the tap popup names the livery (`✦ <name>`) plus lists exactly which dimensions are new ("NEW FOR YOU: TYPE · AIRLINE"). Legend updated (all new / something new / tracking / special livery).
- Own-collection fetch widened from type codes to `{aircraft_type, airline, registration}` (same own-rows RLS path; registrations normalised for the livery check).

## v0.3.3 — 2026-07-12

Rarity overhaul part 1 + spot-map upgrades, driven by the in-app feedback backlog (all three 2026-07-11 items + review of the 2026-06-16 items, three of which were already shipped and are now marked resolved).

### Added
- **Field-of-view cone on the spot map** (`components/SpotMap.tsx`): a brass wedge anchored on the observer, rotating live with the device compass (`heading` prop from `app/spot/page.tsx`). Half-angle is `FOV_HALF_ANGLE = 22°` — deliberately the same as the capture logic's `HEADING_TOL`, so the cone IS the window the camera will accept a target in; length is 45% of the range ring. Hidden (empty geometry) when no compass is available (desktop).
- **Per-kind plane icons on the map**: four silhouettes — `heli` (rotor cross), `light` (straight-wing GA/bizjet), `narrow` (the original jet), `wide` (bigger, swept) — sized differently so a widebody reads bigger than a Cessna at a glance. Classification via new `mapKind()` in `lib/aircraftTypes.ts`: curated category first, ADS-B emitter category (`A1/A2` light, `A5` heavy, `A7` rotorcraft) as fallback for uncurated codes. Heavy military transports (C-17, A400M, KC-135…) render as widebodies.
- **"New for you" marker colouring**: map markers turn brass when the aircraft's type is missing from the viewer's collection (own distinct `aircraft_type` set, fetched client-side under the existing own-rows RLS; refreshed after each capture). Tracking stays stamp-red and wins; a small legend explains both.
- **`category` + military parsing from the live feed** (`lib/aircraft.ts`): readsb `category` (ADS-B emitter class) and `dbFlags` bit 0 (military) now parsed in both the area feed and the capture-time hex lookup, and passed through `/api/flights`.
- **Category taxonomy in code** (`lib/aircraftTypes.ts`): `aircraftCategory()` — a curated ICAO-code→category map mirroring the DB taxonomy (widebody/narrowbody/regional/business jet/general aviation/freighter/helicopter/military/vintage), plus ~45 new helicopter/military/special-freighter entries in the name map (AW139 family, H125–H225, Robinsons, Bells, Sikorskys; C-17, KC-135, P-8, F-15/18/35, Typhoon, Osprey…; Beluga/BelugaXL/Dreamlifter).
- **24h Europe traffic snapshot tooling** (`scripts/rarity-snapshot.mjs` + `scripts/rarity-apply.mjs`): half-hourly sampling at 9 points whose 250 nm circles tile core Europe, counting **distinct airframes per type per 24 h** (a loitering helicopter counts once, like an A320 that crossed once). Primary source adsb.lol (ODbL, commercial-safe; also validates the planned live-feed swap), airplanes.live fallback. Resumable state in `scripts/.rarity-state.json` (gitignored); the apply script prints the distribution and emits reviewable re-tier SQL (measured tier → DB-side category floors → absent-types-to-rare → per-sighting rarity backfill). Zero FR24 credits.

### Changed
- **DB migration `helicopter_category_rarity_floors_and_universe_rpc`:**
  - `helicopter` added to the category taxonomy + a CHECK constraint locks the allowed set; the 15 uncategorised self-grown types backfilled (all 5 helicopters, ATRs, bizjets, King Air/PC-12/PC-7, A300-600F).
  - **Category rarity floors** via new `rarity_rank()`/`rarity_floor()` SQL helpers: helicopter ≥ uncommon, military ≥ rare, vintage ≥ epic — applied to existing rows (the five helicopters left `common`) and enforced on all future registrations. Fixes "helicopters shouldn't go down as common by default".
  - **`register_aircraft_type()` RPC** (SECURITY DEFINER) replaces the client-path universe upsert: new types default to `max('rare', floor(category))` instead of flat `common` — a type absent from the curated universe is rare by construction. Also self-heals placeholder names and fills missing categories on re-capture. The `aircraft_types_insert_auth` RLS policy is **dropped** — the REST API can no longer insert reference rows at all (stronger than the v0.3.1 hardening).
  - `sightings.rarity` backfilled to match the universe (leaderboards already join live; cards/profiles now agree).
- `/api/sightings` derives the category for new types from the curated map first, then live ADS-B hints (military flag / rotorcraft emitter class).

### Feedback housekeeping
- Marked resolved (shipped in earlier releases): airport-code full names (v0.1.24), scrapbook collected/missing filter (v0.1.24/v0.3.0), more pronounced rarity graphics (v0.1.24 border + v0.3.0 stamps/rail).
- Still open by design: measured re-tier lands when the 24 h snapshot completes (part 2); reactions shipped previously but the popularity-sorted feed + capture-of-the-day remain backlog; airline logos in scrapbook pending the licensing review.

## v0.3.2 — 2026-07-06

Pre-marketing pass, part 1: auth simplification + analytics.

### Changed
- **Google-only sign-in.** Magic-link email auth removed (`app/login/actions.ts` deleted; `app/login/page.tsx` is now a single Google OAuth button with a note for previous email users). Removes the Supabase-SMTP deliverability dependency from the signup funnel entirely. Lockout check ran against `auth.identities` first: every active email-only user is on gmail.com (Supabase auto-links Google sign-ins by verified email), so no one loses their logbook. **Manual step: disable the Email provider in Supabase Auth → Providers** (which also moots the leaked-password-protection advisory). The login page also validates the `next` param the same way the callback does.
- **Vercel Web Analytics** (`@vercel/analytics`, `<Analytics />` in `app/layout.tsx`). Cookieless page-view + route analytics. **Manual step: enable Analytics on the project in the Vercel dashboard.**

## v0.3.1 — 2026-07-06

Security + reliability hardening pass, driven by a full from-scratch review (4 parallel review agents over security/auth, data layer, UI, and architecture, plus live inspection of the Supabase RLS policies and advisors).

### Security
- **Server-side capture verification** (`app/api/sightings/route.ts`). The client's `verified`/`rarity` flags are now ignored; the server re-queries the claimed hex on airplanes.live and checks the plane is airborne, within 80 km of the observer, and (when pointing data is present) within a generous bearing/elevation cone. Upstream outage → lenient (photo captures still verify); upstream healthy but plane not airborne → unverified. `lookupLiveByHex` extended to return live position + `found`/`unavailable` distinction.
- **Input validation on capture.** Every `meta` field is type/range-checked (`lat`/`lon`/`heading`/`pitch`/icao24 format/etc.); malformed JSON → 400 instead of an unhandled 500; `capturedAt` clamped to [now−10 min, now+2 min] so daily boards can't be farmed by backdating.
- **Rate limiting + dedupe.** Max 5 captures/user/minute (DB count check); duplicate capture of the same airframe within ±5 min → friendly 409, backed by a DB exclusion constraint `sightings_no_rapid_dupes` (btree_gist, epoch-range, scoped to rows after 2026-07-06 so 3 pre-existing dupes are untouched). Concurrent-insert 23P01 mapped to 409.
- **Photo upload hardening.** 8 MB cap, magic-byte sniff (JPEG/PNG/WebP only — client MIME not trusted on a public bucket), extension follows sniffed type, and a failed insert now removes the just-uploaded photo instead of leaking storage.
- **Open redirect closed** in `app/auth/callback/route.ts` — `next` must match `^\/(?![\/\\])`.
- **DB migration `harden_capture_and_universe_tables`:** `aircraft_types`/`airlines` INSERT policies replaced `WITH CHECK (true)` with format validation (ICAO code regex, `rarity = 'common'`, length caps) so the REST API can't inject junk reference rows or self-graded rarities; `handle_new_user()` EXECUTE revoked from `anon`/`authenticated`.
- **Security headers** (`next.config.ts`): nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (camera/geolocation self-only).
- Profanity filter now folds NFKD + Cyrillic/Greek homoglyphs before collapsing (single-homoglyph bypass closed).
- `*.zip` gitignored (public repo).

### Reliability / correctness
- **Spot page sensor lifecycle:** `watchPosition` id and the orientation listener are now cleaned up on unmount (GPS/compass no longer run forever after navigating away); poll effects no longer restart per GPS fix (coords state is identity-stable within ~11 m) so `/api/flights` really polls at 6 s.
- **Android compass:** uses `deviceorientationabsolute` where available (plain alpha is not north-referenced on Android).
- **Observer altitude** (GPS) now feeds both the detection cone (`/api/flights?alt=`) and capture verification — spotters at elevation get correct angles. Missing aircraft altitude is now `null` (excluded from the cone) instead of a fake 0 m.
- **Undici timeouts** (`headersTimeout`/`bodyTimeout`) on all three external clients — a stalled upstream can no longer hang routes toward the function timeout.
- **FR24:** callsign-keyed fallback lookup when the airframe has no registration (previously those captures silently got no enrichment); callsign cross-check discards a mismatched (stale-reg) FR24 record; airline names cached in-instance for 24 h (~1 credit saved per repeat-carrier capture).
- Unknown callsign prefixes no longer pollute the `airlines` universe (bare 3-letter codes are shown on the card but not upserted).
- Discovery check is now 4 indexed probes instead of scanning the user's entire sighting history per capture.
- Card times render in UTC ("Zulu") via deterministic formatting — kills the hydration mismatch flash and reads correctly for aviation.
- Profile "Rarest catches" now probes each rarity tier over the whole history (was: derived from the 60 most recent rows).
- Feed/board error states: LeaderboardBoard distinguishes RPC failure from an empty board; ReportButton no longer shows "Reported" when the insert failed; comment delete confirms + surfaces errors; comment Enter respects the busy flag and IME composition.

### Performance
- Proxy matcher excludes `/api/*` + metadata routes (the polled `/api/flights` was paying a Supabase auth round-trip per call), and the has-handle check is cached in a `sd-has-handle` cookie instead of a per-request `profiles` query.
- Vercel region `fra1` → `lhr1` (Supabase is eu-west-2/London).
- `/api/aircraft-photo` responses now carry `s-maxage=86400` (+ reg format validation); card photos get `loading="lazy"`.

### UX / a11y / SEO
- New `components/useDialog.ts` hook (Escape close, body scroll lock, focus on open) wired into Lightbox, DiscoveryMoment and GuideModal, all now `role="dialog" aria-modal`; card photo zoom is keyboard-operable with real alt text; UserMenu closes on Escape and its backdrop now sits above the tab bar.
- iOS PWA: `viewportFit: "cover"` + body clearance `calc(68px + env(safe-area-inset-bottom))`; manifest gains a maskable icon entry.
- GuideModal only auto-opens on core routes (not legal pages or shared card links); tab bar active states fixed (own profile only; Books/Liveries light Scrapbook; Settings lights Profile).
- Admin reports now link to the reported sighting; ShareButton falls back to a copy prompt when share/clipboard are unavailable.
- `metadataBase` + root OpenGraph block, new `app/robots.ts` + `app/sitemap.ts` (static routes + public profiles).

### Housekeeping
- Deleted dead `components/NavLinks.tsx` + `components/CollectionGrid.tsx`; rewrote the boilerplate README; `package.json` version synced to the app version (0.3.1).

### Notes
- **Requires no new env vars.** `NEXT_PUBLIC_SITE_URL` is optional (falls back to skydex-two.vercel.app).
- Remaining manual items: enable leaked-password protection in Supabase Auth settings; decide whether `research/` should stay in the public repo; consider `next/image` adoption (needs `images.remotePatterns`).

## v0.3.0 — 2026-06-26

Full visual redesign — **"The Logbook"** direction (paper + teal identity, sharpened). Structural + asset + motion pass; design tokens (`app/globals.css` `@theme` + `files/tokens.css`) are unchanged, so the colour/type system is intact. Nothing here touches Supabase, auth, FR24, or data shapes — presentation, assets, and one new client nav component.

### Added
- **Luggage-tag logo.** New `public/logo-tag.svg` (full lockup with string + eyelet) and `public/logo-tag-mark.svg` (cropped tag body for the header). Font-family `<style>` baked into the SVGs so the wordmark renders correctly when loaded via `<img>`. Mirrored to `files/logo-tag.svg`.
- **Bolder rarity stamps.** Drop-in replaced `public/stamps/{common,uncommon,rare,epic,legendary}.svg` with pip-based versions (tier = fill colour + pip count; common is intentionally hollow; escalating ornament uncommon→legendary). Same filenames, so no code references changed. Mirrored to `files/stamp-*.svg`.
- **Bottom tab bar (all viewports).** New `components/MobileTabBar.tsx` (client) — fixed bar with labelled icons (Spot · Scrapbook · Feed · Boards · Profile), active = `bg-sky-tint`, inner row centred at `max-w-md`. Mounted in `app/layout.tsx` for signed-in users; `<body>` gets `pb-[68px]` so content + footer clear it. This is now the **single** primary nav — the desktop icon row was removed from `TopNav` (which keeps the logo + account menu); `NavLinks.tsx` is no longer used.
- **Redesign motion** (`app/globals.css`): `sd-tag-swing` (idle hero/empty-state sway), `sd-stamp-thunk` (verify reward), `sd-card-rise` (card entrance) keyframes + helper classes, all gated on `prefers-reduced-motion`.
- **Profile** (`app/u/[handle]/page.tsx`): teal cover band with a faint oversized plane glyph, avatar framed overlapping the band (`border-4 border-paper`), a 3-cell stat strip (Sightings / Types / Rank), a home-base luggage tag (airport code + name via `airportName`), and a "Rarest catches" 2-col grid.
- **Books** (`app/books/page.tsx`): All / Missing filter via a `view` search param (server-side, no client JS).

### Changed
- **Header** (`components/TopNav.tsx`): text wordmark → `logo-tag-mark.svg`.
- **Favicon / PWA** (`app/icon.tsx`, `app/apple-icon.tsx`): plane-on-teal → luggage-tag mark (tag body + eyelet + plane glyph), kept font-free so `ImageResponse` needs no external font fetch.
- **Home** (`app/page.tsx`): swinging `logo-tag` hero hung from a pin, CTA pair, and a 01/02/03 "how it works" step strip; release log kept below.
- **Scrapbook** (`app/scrapbook/page.tsx`): the four collapsible collection `<details>` (Types/Carriers/Departures/Destinations) replaced by luggage-tag book tabs into `/books`; Departures/Destinations kept as a compact tally; empty state gets the swinging tag. Removed now-unused `CollectionGrid`/`airlineLogoUrl` usage.
- **Books** (`app/books/page.tsx`): tabs restyled as luggage tags (left dot coloured by book kind, active = `bg-ink text-paper`); polaroid slots → clean ruled boxes (collected = photo + small stamp bottom-right; empty = dashed + hatch + mono "NOT YET SPOTTED").
- **Cards** (`components/SightingCard.tsx`): added a rarity-colour rail down the left edge (skipped on special-livery cards, which keep their animated border as the signal).
- **Feed** (`app/feed/page.tsx`): Latest / Following / Nearby scope chips (Following/Nearby marked upcoming).
- **Comments trigger** (`components/Comments.tsx`): restyled to a sky-toned link with a speech-bubble icon and an "N comments" count.
- **ProgressWheel** (`components/ProgressWheel.tsx`): now a client component — the progress arc sweeps up from empty on mount (skipped under reduced-motion).

### Notes
- Verified via clean `next build` + production-server screenshots (dev Turbopack HMR socket blocks the screenshot tool's network-idle wait; a `skydex-prod` launch config on port 3100 was added for visual checks).

## v0.2.7 — 2026-06-25

### Changed
- **License-clean aircraft type names.** New `lib/aircraftTypes.ts` — a curated, static ICAO type designator → friendly-name map (compiled from public ICAO Doc 8643 designators), with `aircraftTypeName()` (full, e.g. "Airbus A320neo") and `aircraftTypeDisplay()` (manufacturer-stripped short form). This **replaces airplanes.live's `desc`** as the source of the names persisted into the `aircraft_types` universe — that feed's free tier is non-commercial, so persisting its strings was a licensing risk (last open item from the data-licence review). The live feed / FR24 still supply the ICAO code; this map supplies the name.
  - `app/api/sightings/route.ts`: type-name persistence now reads the static map (removed the `typeDesc`/`MANUFACTURER_RE` derivation and the unused `typeDesc` variable). Unknown codes fall back to the raw ICAO code until curated.
  - **Re-seeded the 79 existing `aircraft_types` rows** from the map (`name` + `display_name` via the same manufacturer-strip regex, computed in SQL to match the app helper). Fixes inconsistent live-feed-derived names (`AGUSTA AW-109 Grand` → `AgustaWestland AW109`, `BEECH 200 Super King Air` → `Beechcraft King Air 200`, `ATR-72-500` → `ATR 72-500`, etc.). Rarity tiers untouched.

### Notes
- Completes the persisted-data licence cleanup: routes/operator/reg now come from FR24 (v0.2.6) and type names from our own map — the card's persisted layer no longer depends on non-commercial sources.

## v0.2.6 — 2026-06-25

### Added
- **Flightradar24 capture enrichment (hybrid data architecture).** airplanes.live still drives the live map / nearby feed (transient, nothing persisted); at capture, a single filtered FR24 `full` lookup by **registration** now provides the authoritative data we persist on the card. New `lib/fr24.ts` (`lookupFr24ByRegistration`, `lookupFr24AirlineName`) — IPv4 undici dispatcher, `Authorization: Bearer $FR24_API_TOKEN` + `Accept-Version: v1`, best-effort (returns nulls on missing token / rate-limit / outage so a capture never fails).
  - `app/api/sightings/route.ts`: FR24 is the source of **origin/destination** (direction-correct — FR24 knows the leg, so the old position-based heuristic is gone), **operator** (`operating_as` → `lookupFr24AirlineName` → `normalizeBrand`, fallback callsign), and backfills **type/registration** when the live feed lacked them. Persists new fields and a derived **wet-lease** flag.
  - New `sightings` columns (migration `add_fr24_flight_fields`): `flight_no`, `painted_as`, `operating_as`, `eta`, `gspeed_kt`, `vspeed_fpm`. Mirrored into the `feed_sightings` and `all_sightings` views.
- **Richer cards** (`components/SightingCard.tsx`, wired through `app/feed/page.tsx` `COLS`/`FeedRow`): IATA flight number (`flight_no`, falls back to callsign), a **PHASE** line (Climbing / Cruising / Descending + ground speed, from FR24 `vspeed`/`gspeed` at capture), an **ETA** line, and a **Wet-lease** badge when `painted_as ≠ operating_as`.

### Changed / Removed
- **adsbdb retired.** Deleted `lib/route.ts` (`lookupRoute` / `lookupAircraftType` / `resolveRouteDirection`) — FR24 supplies routes + airframe natively. This **closes the adsbdb route-persistence licensing flag** (their terms discouraged incorporating routes into another DB) and removes the leg-direction heuristic entirely.

### Notes
- **Cost (Explorer / $9, 60k credits/mo):** ~8 credits per capture (filtered `full`) + ~1 (airline-info) ≈ 9/capture → ~6,600 captures/month. FR24 live positions only return *airborne* aircraft — fine at capture.
- **Requires `FR24_API_TOKEN`** in env (local `.env.local` + Vercel project env). Without it, capture still works but FR24 fields stay null and carrier falls back to the callsign map.
- **Friendly type names + rarity stay in `aircraft_types`** (our curated/self-growing universe) — FR24 has no aircraft-type catalogue, only the ICAO code. Type `display_name` is still seeded from airplanes.live's `desc` at capture; making that fully license-clean (a static ICAO→name seed) is part of the upcoming **backfill-data cleanup review**.
- **Liveries unchanged** — special/retro liveries are reg-specific and invisible to FR24 (`painted_as` only gives the painted brand); the curated `lib/specialLiveries.ts` reg-match stays. FR24 adds wet-lease detection as a separate, new signal.

## v0.2.5 — 2026-06-25

### Added
- **Routes re-enabled, now direction-validated.** Departure → destination returns to cards, the lightbox, the discovery moment, the Scrapbook (Departures/Destinations sections), the Airports leaderboard metric, the profile Airports stat tile, the share page, and the OG image. The v0.2.3 root cause — adsbdb's callsign→route is not position-aware, so a plane caught on its return leg came back with the canonical (outbound) route reversed — is now corrected at capture:
  - `lib/route.ts`: `lookupRoute` now also returns each airport's lat/lon. New `resolveRouteDirection(route, planeLat, planeLon, track)` compares the plane's ground track against the bearing to each airport. A plane should fly **toward** its destination and **away** from its origin; if it's clearly heading toward the listed origin, it's the return leg and origin/destination are swapped. If the geometry is ambiguous (no track, mid-turn/hold, or the two endpoints aren't distinguishable) it returns nulls — we show nothing rather than a guess. Tolerances `ALIGN_TOL` (75°) and `SEPARATION` (45°) are tunable.
  - `app/spot/page.tsx`: capture `meta` now includes the plane's `planeLat`/`planeLon`/`track` (already on the live feed / `Candidate`).
  - `app/api/sightings/route.ts`: persists the **direction-corrected** `origin`/`destination` and re-enables origin/destination "discoveries".
  - Display restored in `components/SightingCard.tsx` (ROUTE line), `components/Lightbox.tsx`, `components/DiscoveryMoment.tsx` (New DEPARTURE / DESTINATION chips), `app/scrapbook/page.tsx` (per-airport counts, sorted most-seen first), `components/LeaderboardBoard.tsx` (Airports pill), `app/u/[handle]/page.tsx` (Airports tile), `app/s/[id]/page.tsx` + `opengraph-image.tsx`.

### Notes
- **Persisting routes re-opens the adsbdb licensing flag** (their terms discourage incorporating route data into another DB — see `research/data-licences.md`). Flagged in `app/api/sightings/route.ts`; revisit before any commercial launch / the FR24-acquisition goal (get permission, or move to look-up-on-display).
- Direction validation needs the plane's broadcast `track`; sightings where it's absent simply carry no route (conservative by design). Tolerances may want live tuning.

## v0.2.4 — 2026-06-19

### Added
- **Special liveries** — specially-painted aircraft (anniversaries, sponsor tie-ins, retro/heritage schemes, one-offs) are now a premium collection on top of the existing type/carrier/rarity collections.
  - New static reference module `lib/specialLiveries.ts`: a **point-in-time snapshot of 2,043 unique registrations** scraped from the public TablePress table on https://airportwebcams.net/special-liveries/ (columns Country / Airline / Aircraft Type / Registration / Description), captured 2026-06-19. Exposes `SPECIAL_LIVERIES`, `SPECIAL_LIVERIES_COUNT`, `normalizeReg()`, `specialLivery()` and `isSpecialLivery()`. **Matching is by registration**, which sightings already store, so special-livery status is derived at render time — **no DB column, no migration, and existing sightings are flagged retroactively.** Mirrors the static-map pattern of `lib/airports.ts` / `lib/airlines.ts`.
  - **Animated card treatment** (`components/SightingCard.tsx` + `app/globals.css`): a livery card swaps its static rarity border for `.sd-livery`, an animated holographic sheen that travels through a 3px gradient border (brass → sky → stamp) using the padding-box/border-box background-clip trick so it works inside the card's `overflow-hidden`. Adds a glowing "✦ Special Livery" badge on the photo and a `LIVERY` line in the detail block. The 5 rarity tiers are untouched — this is a separate overlay. Honours `prefers-reduced-motion` (animation off → static gradient).
  - **Capture celebration** (`app/api/sightings/route.ts`, `app/spot/page.tsx`, `components/DiscoveryMoment.tsx`): the sightings API returns `specialLivery`; the discovery moment shows a "✦ Special livery — {name}" banner and applies the animated frame to the reward photo.
- **Liveries checklist** — new `/liveries` page (`app/liveries/page.tsx` + `components/LiveryChecklist.tsx`), added to the nav (`components/NavLinks.tsx`, star icon) and protected in `proxy.ts` (auth + handle required, like Scrapbook). A brass `ProgressWheel` hero shows collected/2,043; the list is grouped by airline (~390) in collapsed `<details>` sections with per-airline counts, a text search (airline / livery / registration / type) and an All · Collected · Missing filter. Collected liveries are lit (brass + ✦), the rest greyed. A "Liveries" progress wheel also links from the Scrapbook hero.

### Notes
- The livery list is a **snapshot** and drifts as airlines add/retire liveries. **Refresh path:** re-fetch the page with a browser `User-Agent` + `Accept` header (the server returns 406 to default clients), re-parse the `#tablepress-8` rows into `lib/specialLiveries.ts`.

## v0.2.3 — 2026-06-18

### Changed
- **Airports removed from the product (temporarily).** adsbdb's callsign→route lookup is not position-aware, and airlines reuse callsigns across legs/days, so a plane genuinely landing at one airport routinely returned a stale, unrelated route (observed: an easyJet arriving at Jersey came back as ACE; another as Belfast). Rather than show confidently-wrong data, all airport/route surfacing is hidden until a position-aware route source is wired in:
  - `app/api/sightings/route.ts` now stores `origin`/`destination` as `null` and never flags origin/destination "discoveries". The adsbdb lookup is **kept** for the airline (carrier) brand only.
  - Removed route display from `components/SightingCard.tsx`, `components/Lightbox.tsx`, `components/DiscoveryMoment.tsx` (no more "New AIRPORT" chips), the share page (`app/s/[id]/page.tsx` description + `opengraph-image.tsx` card).
  - Removed the scrapbook Departures/Destinations sections + the "Airports" hero stat (`app/scrapbook/page.tsx`), the public-profile "Airports" stat tile (`app/u/[handle]/page.tsx`), and the "Airports" leaderboard metric (`components/LeaderboardBoard.tsx`).
  - DB columns, the `airports`/`origin`/`destination` paths in RPCs and `feed_sightings`, and `components/AirportCode.tsx` / `lib/airports.ts` are left in place so re-enabling (with a position-aware source) is a display-only change. `home_airport` (user-set, reliable) is unaffected.
- **Wider detection cone.** `ELEV_RANGE_FACTOR` raised 2.5 → 3.5 in `app/api/flights/route.ts` — aircraft reach further per degree of elevation, so more overhead traffic falls inside catch range.

## v0.2.2 — 2026-06-18

### Changed
- **Single live data source.** `lib/aircraft.ts` now uses **airplanes.live** as the sole live provider for positions, ICAO type code, registration **and** the human-readable type description — dropping the adsb.lol-primary / airplanes.live-fallback chain (and adsb.lol's hex lookup). Reason: adsb.lol returns `desc = null` for every aircraft, so whenever it answered, friendly type names degraded to bare codes (e.g. `B788` instead of `787-8 Dreamliner`); standardising on airplanes.live makes enrichment consistent. `fetchAircraftNear` and `lookupLiveByHex` simplified to the single endpoint; `source` is always `airplanes.live`. adsb.lol removed from the **Live aircraft data** attributions (`app/attributions/page.tsx`); adsbdb (routes) and Planespotters (photos) unchanged.
- **Licensing note (FR24 goal):** airplanes.live's free tier is non-commercial (paid tier exists); adsb.lol (ODbL) was the commercial-safe option but lacks descriptions. Trade-off chosen for data consistency — flagged in `lib/aircraft.ts` to revisit before any commercial launch. Routes still come from adsbdb (no live feed carries them); "missing planes" remain a function of the detection cone in `app/api/flights/route.ts`, not the data source.

## v0.2.1 — 2026-06-17

### Added
- **Altitude in the "In range" list** (`app/spot/page.tsx`): each candidate row now shows the aircraft's altitude in feet (converted from `Candidate.altM`, the metres already returned by `/api/flights`), beside the distance. The right-hand readout is split onto two lines (distance · altitude / BRG · ELV) so it stays tidy on mobile. Null altitude renders as "—".

### Changed
- **Top bar redesign** — fixes the logo offset (the right-hand links wrapped to a second line on narrow screens) and frees space. Text nav labels replaced with compact icons via new `components/NavLinks.tsx` (client; uses `usePathname()` to highlight the **active page** with a sky tint + `aria-current`). `components/TopNav.tsx` is now `flex-nowrap` with a divider before the avatar; `components/UserMenu.tsx` hides the `@handle` text on mobile (`hidden sm:inline`), showing just the avatar. Icons: camera (Spot), book (Scrapbook), list (Feed), trophy (Boards), each with `title`/`aria-label`.

## v0.2.0 — 2026-06-17

> **"Scrapbook" launch** — the flagship: a progress-as-hero redesign of the scrapbook. (0.2.0 was re-scoped from the native-iOS milestone, which now defers to 0.3.0.)

### Added
- **Scrapbook hero** (`app/scrapbook/page.tsx`): a completion dashboard at the top — `ProgressWheel` donuts for Types and Carriers (distinct collected / universe total), plus Sightings and unique-Airports counts. `components/ProgressWheel.tsx` is a **pure SVG, server-rendered** donut (no client JS): `stroke-dasharray` ring, brand `--color-sky`, Plex Mono % in the centre, and a dotted inner ring echoing the rarity-stamp motif. Reused small (size 46) in the collapsed section headers.
- **Totals by rarity**: a stacked bar (one segment per tier sized by count) + per-tier count chips, coloured by `--color-rarity-*`. Replaces the old 5-dot legend.
- **Per-airport counts**: Departures/Destinations chips now show how many times each airport was spotted, e.g. `LHR 152`, sorted by count desc. `components/AirportCode.tsx` gains an optional `count` prop (collapsed `LHR 152`; revealed `LHR · London Heathrow · 152`; unknown codes still show the count).

### Changed
- **Decluttered top**: removed the three plain stat cards and the rarity legend in favour of the hero.
- **Collapsible sections**: Types, Carriers, Departures, Destinations are now native `<details>/<summary>` disclosures, **collapsed by default** (zero client JS; keyboard-accessible). Each summary carries its name, count, a small wheel (Types/Carriers) and a chevron that rotates via the Tailwind `group-open` variant. `components/CollectionGrid.tsx` gains a `compact` prop that drops its own heading (the summary owns it) and renders just the All/Collected/Missing filter + grid.
- **Rarity constants consolidated** into new `lib/rarity.ts` (`RARITY_TIERS`, `RARITY_RANK`, `RARITY_COLOR`); adopted by the scrapbook, `components/SightingCard.tsx`, and `app/books/page.tsx` (removing three duplicate copies).

## v0.1.27 — 2026-06-17

> Airline logos in the scrapbook (backlog #24). Real logos via CDN.

### Added
- **Airline logos** on the scrapbook Carriers grid. `lib/airlines.ts` gains a brand-name → IATA map (`AIRLINE_IATA`, keyed by lowercased name; covers the seeded 73 carriers) plus `airlineIata()` and `airlineLogoUrl()` — the latter returns a **Kiwi.com** logo CDN URL (`images.kiwi.com/airlines/64/{IATA}.png`, full-colour transparent PNG) or null when we can't resolve a code. Source is centralised in one helper so the CDN is swappable.
- `components/CollectionGrid.tsx` `CollectionItem` gains optional `iconUrl`; chips render the logo (lazy-loaded `<img>`) before the label. `app/scrapbook/page.tsx` sets it on carrier items via `airlineLogoUrl`. Carriers we can't map (and the type chips) fall back to text alone.
- **Attributions**: new "Airline logos" section crediting Kiwi.com and noting logos remain the airlines' trademarks (used for identification only).

## v0.1.26 — 2026-06-17

> Moderation + input validation (backlog #27, #28).

### Added
- **Profanity filter** (#27) on usernames and comments. New `lib/profanity.ts` (`containsProfanity`) — a curated banned-word list matched against a "collapsed" form of the text (folds leetspeak, strips spacing/punctuation) so common evasions ("f u c k", "sh1t", "@ss") are caught. Enforced **server-side**:
  - Comments now post through a new `addComment` server action (`app/actions/comments.ts`) instead of a direct client insert, so the filter can't be bypassed from the browser; the author is taken from the server session. `components/Comments.tsx` calls the action and shows a blocked-comment message.
  - `updateProfile` rejects a handle containing profanity.
- **Home-airport validation + autocomplete** (#28): the `home_airport` field gains a type-ahead `<datalist>` of known airports (code + name, from `AIRPORTS_LIST` in `lib/airports.ts`). `updateProfile` now validates the code (`^[A-Z]{3,4}$`) and returns an error on bad input instead of silently discarding it.

## v0.1.25 — 2026-06-17

> Live spotting map (backlog "map view"). View-only, capture-only identity preserved.

### Added
- **Live map tab on `/spot`** (`components/SpotMap.tsx`): MapLibre GL map on a CARTO Positron vector basemap, centred on the observer. Renders every aircraft in an 80 km radius as a plane marker rotated to its track (falls back to bearing), plus an observer dot and a dashed ~40 km capture-range ring. Tap a plane → popup with reg/type/distance and a **Track & aim →** button that locks the aircraft and switches back to Camera. The map **never logs a sighting** — only a verified photo does (preserves the v0.1.10 capture-only decision).
  - Maplibre is dynamically imported inside an effect (client-only); brand colours (ink/sky/stamp/paper) drive the markers; map follows the observer (dot + ring move) without yanking the user's pan.
- **`?all=1` mode on `/api/flights`**: skips the detection-cone filter and returns every aircraft in radius (still annotated with bearing/distance/elevation) for the map. Default cone behaviour for capture is unchanged.
- **Camera / Map toggle** on `/spot`; camera stream stays mounted under the map so switching back is instant. Map polls every 6 s only while the Map tab is open.
- **Attribution**: new "Maps" section on `/attributions` crediting CARTO, MapLibre, and OpenStreetMap.

### Dependencies
- Added `maplibre-gl`.

## v0.1.24 — 2026-06-17

> User-feedback batch (from the `feedback` Supabase table). Backlog #21, #22, #23.

### Added
- **Rarity-coloured card border** (#21): `components/SightingCard.tsx` cards now carry a 2px border in their tier colour (`RARITY_COLOR` mirrors the `--color-rarity-*` vars), so common vs rare is obvious at a glance — restoring the colour cue lost when the side rail became a corner stamp in v0.1.7.
- **Tap an airport code to reveal its full name** (#22): new `lib/airports.ts` IATA→name lookup (major hubs, UK/Europe-weighted; unknown codes fall back to the bare code) and `components/AirportCode.tsx` (client; tap toggles the name, `title` for hover). Wired into the card ROUTE line and the scrapbook Departures/Destinations chips.
- **Collected / Missing filter on the scrapbook** (#23): new `components/CollectionGrid.tsx` (client) renders the Types and Carriers universes with an All · Collected · Missing toggle; `app/scrapbook/page.tsx` computes the chip visuals per item and passes them through.

## v0.1.23 — 2026-06-17

### Added
- **Public profiles** (backlog #19) at `/u/[handle]`: header (avatar, @handle, home airport, "spotter since"), favourites, a Medals placeholder (until achievements), a stats grid, and the spotter's verified sightings. Reads via `feed_sightings` (verified-only, no GPS); profiles are publicly readable.
  - `profile_stats(p_user)` SECURITY DEFINER RPC → value **and rank** per metric (spots all/month/week/today, types, airlines, airports, rarity), with ranks computed across all spotters (works beyond the top 50). Window ranks null out when the value is 0.
  - **Favourites**: `profiles.featured_sighting_ids uuid[]` (max 3, owner-only `toggleFavourite` action with ownership check); owners pin via ☆ on their cards (`components/ProfileSightings.tsx`).
- **@handles are now links** to `/u/[handle]` on sighting cards, comments, and leaderboard rows.

### Changed
- **Settings/Profile split**: the old `/profile` account screen moved to **`/settings`**; `/profile` now redirects to your own public profile (or `/settings` if no handle yet). Top-right is now a **dropdown** (`components/UserMenu.tsx`) → Profile + Settings.
- `proxy.ts` protects `/settings` and sends the username-setup redirect there; privacy page links to `/settings`.

## v0.1.22 — 2026-06-17

### Added
- **Leaderboards** (engagement spec, slice 3) at `/leaderboards` (nav: "Boards").
  - `leaderboard(p_metric, p_window)` SECURITY DEFINER RPC over verified sightings + profiles, returning ranked `{user_id, handle, avatar_seed, is_admin, value, rank}` (top 50, ties share a rank). Metrics: `spots` (window-aware: today/week/all), `types`, `airlines`, `airports` (distinct origins ∪ destinations), `rarity` (sum of per-distinct-type tier weights: common 1 · uncommon 2 · rare 5 · epic 10 · legendary 25).
  - `components/LeaderboardBoard.tsx` (client): metric switcher + a time toggle shown only for Spots; medals for top 3; viewer's row highlighted. `app/leaderboards/page.tsx` passes the viewer id. "Boards" added to `TopNav`.

## v0.1.21 — 2026-06-17

### Fixed
- **Missing aircraft type on capture**: the type came only from the primary live feed (airplanes.live). When that feed returns a position with no aircraft-database match — common for brand-new deliveries — the sighting stored `aircraft_type = null` permanently. The secondary feed (adsb.lol) was consulted only if the primary *failed entirely*, never for missing metadata, so its richer data went unused. (Trigger: RJA266 / JY-RBC, a Royal Jordanian 787-9 delivered May 2026 and not yet in airplanes.live's or adsbdb's databases — but present in adsb.lol's.)
  - `/api/sightings` now recovers a missing type at capture: first `lookupLiveByHex()` (`lib/aircraft.ts`) re-queries the live feeds by hex (adsb.lol first — the airframe is overhead, so it's trackable), then `lookupAircraftType()` (`lib/route.ts`) falls back to adsbdb's static airframe DB. The resolved registration is backfilled too. Degrades gracefully to null if no source has it.
  - Backfilled the existing RJA266 sighting to `B789` / `JY-RBC` (uncommon).

### Changed
- **adsb.lol is now the primary live feed**, with airplanes.live as the fallback (was the reverse). adsb.lol's aircraft database is more complete — it matches brand-new deliveries airplanes.live hasn't yet — so types now resolve correctly in the live spot list, not only after capture. Both are keyless; adsb.lol is ODbL / commercial-friendly.

## v0.1.20 — 2026-06-17

### Added
- **Discovery moment** (engagement spec, slice 2; also delivers backlog #20): a full-screen reward screen on every verified capture, escalated when the catch is new to your collection.
  - `type_popularity(p_type)` SECURITY DEFINER RPC → distinct-spotter counts for the type today / this week / this month / ever, total spotters, and % of spotters with the type (aggregates only, no PII).
  - `/api/sightings` now also returns `discoveries` (new type / carrier / airport for this user, computed before insert) + `typeName`.
  - `components/DiscoveryMoment.tsx`: photo + rarity stamp, NEW chips, popularity ladder (just-in-time fetch), hero line ("only one in the world ✦" when ever ≤ 1 — fires regardless of rarity by decision), community %, and Share / Scrapbook / Spot another actions. Replaces the old inline "Sighting verified" box in `/spot`.

### Decisions (from 2026-06-17 discussion)
- Trigger: screen on **every** verified catch, escalate on new (option B).
- "Only one in the world" line: **embraced** even for common types during testing.
- Popularity measured at **aircraft-type** level (registration too commonly unique).
- Stats fetched **just-in-time** after the screen renders.

## v0.1.19 — 2026-06-17

### Added
- **Reactions** (first slice of the engagement spec — `research/engagement-spec.md`): react to feed sightings with a curated set (🛫 🔥 😍 👀 🏆), in addition to commenting.
  - New `public.reactions` table (RLS: public read, insert/delete own; `CHECK` locks the emoji set; unique per `(sighting_id, user_id, emoji)`; cascades on sighting/user delete).
  - `lib/reactions.ts` (shared set), `components/Reactions.tsx` (optimistic toggle via the Supabase client, mirroring `Comments`), wired through `SightingBrowser` and pre-aggregated in the feed page.
  - Reactions included in the data export (`/api/export`).

## v0.1.18 — 2026-06-17

### Added
- **Attributions page** (`app/attributions/page.tsx`, footer-linked): user-facing credit for the data sources the licences require — adsb.lol (ODbL 1.0), airplanes.live, adsbdb (routes by David Taylor & Jim Mason), Planespotters (per-photo credit + link-back already in the lightbox).
- **`research/data-licences.md`**: canonical write-up of every data source, its terms, commercial-use status, and compliance state (backlog #16).

### Changed
- **Removed OpenSky from the live flight-data chain.** Its terms require a written licence for operational use in any live product/service even for non-profits, and it firewalls datacenter IPs (never served production). adsb.lol (ODbL, commercial-friendly) covers the gap. Unused `OPENSKY_CLIENT_ID`/`OPENSKY_CLIENT_SECRET` env vars can be removed from Vercel.

### Known flag
- **adsbdb route data is still persisted** onto each sighting; their terms forbid incorporating route data into other databases without explicit permission. Documented in `research/data-licences.md` for a later decision (stop persisting, or seek permission).

## v0.1.17 — 2026-06-16

### Added
- **Admin captain-badge avatar**: `public/admin-avatar.svg` (from `files/avatar/admin.svg`); `Avatar` gains an `admin` prop; `is_admin` threaded through feed views + comments; admins render the badge everywhere (editor shows it, no shuffle).
- **BeReal-style lightbox**: your photo + the Planespotters reference shown as big + corner thumbnail; tap the thumbnail to swap which is large.

## v0.1.16 — 2026-06-16

### Added
- **Editable avatars**: `profiles.avatar_seed` + `avatar_updated_at`; `AvatarEditor` (shuffle + save) with a once-per-day server limit (`updateAvatar`). `avatar_seed` threaded through `feed_sightings`/`all_sightings` views, feed/comments queries, `Avatar` seeds by `avatar_seed ?? handle`, `getViewer` returns it.

### Changed
- **Top-right is now avatar + @handle → Profile** (Profile removed from the nav links); **Sign out moved into the Profile**.

## v0.1.15 — 2026-06-16

### Added
- **Reference aircraft photo** in the lightbox: `/api/aircraft-photo?reg=` proxies Planespotters (server-side UA, IPv4 dispatcher) → photo of the exact airframe (correct livery) with photographer credit + link-back (their non-commercial terms). Fetched on demand by `Lightbox`.

### Changed
- `ELEV_RANGE_FACTOR` 1.5 → 2.5 (widened the detection cone after the initial tightening).

## v0.1.14 — 2026-06-16

### Added
- **User avatars** (`lib/avatar.ts`, `Avatar` component): deterministic SVG minted from the handle (12 motifs × 8 palettes × 3 treatments = 288), ported from `files/avatar/build_avatars.py` — generated on the fly, nothing stored. Shown on `SightingCard` (@handle), `Comments`, and the Profile header.

## v0.1.13 — 2026-06-16

### Changed
- **Detection cone:** base radius halved (client requests 40 km) and added elevation-scaled max range in `/api/flights` (`maxRangeKm` = `clamp(elevation × 1.5, 3 km, radius)`, `MIN_ELEVATION` 2°). Tunable constants at the top of the route.
- **Scrapbook airports split** into Departures (origins) and Destinations.

## v0.1.12 — 2026-06-16

### Added
- **Lock/track a chosen aircraft** in `/spot`: tap a plane in the in-range list to lock it; capture targets only that plane (must be in the cone), auto-unlocks when it leaves range. Reticle/banner/button reflect locked vs auto-match; "Stop tracking" button.
- **Photo lightbox** (`Lightbox`): tap a card photo on the feed or scrapbook to view full screen with details; `SightingCard` gains an optional `onOpen`.

## v0.1.11 — 2026-06-16

### Added
- **Sign in with Google** on the login page (`signInWithOAuth`, reuses `/auth/callback`). Additive — magic-link unchanged; same-email Google logins link to the existing account.
- First-run **guide** (`GuideModal`, shown once via `skydex_guide_seen`), reopenable from Profile → "How it works".
- **Delete your own sightings** from the Scrapbook (`canDelete` on `SightingBrowser`); `deleteSighting` relies on RLS (owner or admin). Feed delete stays admin/dev-mode.
- **Feed comment counts:** `Comments` shows "Comments (n)"; feed computes per-sighting counts via `SightingBrowser`.

### Changed
- Moved the dev-mode toggle from the top nav into Profile → Developer (admin only).

### Fixed
- **Privacy:** scrapbook + books scope to `user_id = me` explicitly, so admins no longer see others' sightings in their own scrapbook.

## v0.1.10 — 2026-06-16

### Changed
- Rarity stamp on cards enlarged to match the verified stamp (h-16).
- **Removed "Log from map"** — capture is now verified-only; dropped the selected-candidate state and made the in-range list display-only. `submit()` always captures a photo.

## v0.1.9 — 2026-06-16

### Added
- **Feedback**: `feedback` table (RLS insert-own / select+update-admin); `FeedbackForm` on the profile; admin `/feedback` review page + `resolveFeedback` action; dev-mode link.
- **Shareable card images**: public `/s/[id]` share page (reads `feed_sightings`, verified only) with `opengraph-image.tsx` generating a 1200×630 branded social card via `next/og`; `ShareButton` (Web Share API / clipboard) on verified cards.
- **PWA / install**: `app/manifest.ts`, generated `icon`/`apple-icon` (teal roundel), `appleWebApp` + `themeColor` metadata — "Add to Home Screen" gives a standalone app.

## v0.1.8 — 2026-06-16

### Changed
- **Carriers consolidated by brand**: `airlines` re-keyed to `name` (PK), AOC variants merged (easyJet Europe → easyJet) via `normalizeBrand`. Sightings now store the brand; scrapbook/books carrier matching is by brand name, not callsign ICAO prefix.
- **Self-growing universe**: at capture, the aircraft type (by ICAO code, with `desc`-derived display name) and the airline brand are upserted into the reference tables (RLS insert policies for authenticated). The universe now always matches the live data; unknown types default to `common` rarity (curated tiers preserved).

## v0.1.7 — 2026-06-16

### Added
- **Books view** (`/books`, protected): polaroid albums by Type / Airline / Rarity using the field-logbook design — filled polaroids (your photo + handwritten Caveat caption + rarity stamp) and dashed "Not yet spotted" gaps, with a per-book progress bar. Linked from the scrapbook ("Open as book").
- **Rarity stamps**: per-tier SVGs from `files/` copied to `public/stamps/`; shown on `SightingCard` (replacing the rarity side rail) and on book polaroids.
- **Friendly type names**: `aircraft_types.display_name` (auto-derived, e.g. `A380-800`), shown on cards, grids and books instead of ICAO codes (A388).

### Notes
- Carrier "source of truth" (e.g. easyJet vs easyJet Europe AOC variants) still to be decided — see follow-up.

## v0.1.6 — 2026-06-16

### Added
- **Rarity universe**: `aircraft_types` (73 rows, each tiered common→legendary) and `airlines` (~67 rows) reference tables (public-read RLS). Sighting `rarity` is now computed from the captured type at `/api/sightings`.
- **Scrapbook universe grids**: full Types grid (rarity-coloured, collected lit / rest greyed) and Carriers grid (matched by callsign ICAO prefix), each with X/N counts and a rarity legend. Airports remain collected-only.

## v0.1.5 — 2026-06-16

### Added
- **Route enrichment** (`lib/route.ts` via adsbdb): at capture, look up the callsign to store `origin`/`destination` (IATA) and `airline`; cards show the route and the Scrapbook **Airports** checklist now populates. `feed_sightings` + `all_sightings` views extended with route columns.
- **Zoom overview**: an always-mounted, unzoomed corner `<video>` (with a framed-region box) shown during digital zoom in `/spot`, to help locate the aircraft.

### Changed
- **Semantic versioning** — renumbered prior releases to `0.1.0`–`0.1.4`.

## v0.104 — 2026-06-16

### Added
- **Reporting** (`reports` table, RLS insert-own / select+update-admin): `ReportButton` on feed cards and comments; admin-only `/reports` review page with a `resolveReport` action; dev-mode link to it from the feed.
- **Camera zoom** in `/spot`: native `MediaStreamTrack` zoom where supported (`applyConstraints`), otherwise digital zoom (CSS transform on the preview + centre-crop on capture so the photo matches). Zoom slider overlay.

## v0.103 — 2026-06-16

### Added
- **Privacy** + **Terms** pages, linked from a site footer (with version).
- **Data export**: `GET /api/export` downloads the user's profile/sightings/comments as JSON.
- **Account deletion**: `delete-account` Supabase Edge Function (service-role; removes photos + cascades auth user → profiles/sightings/comments), invoked by a `deleteAccount` server action from the profile Danger Zone.

### Changed
- **All admin tools now gated behind dev mode** (`isAdmin && skydex_dev` cookie): the DevModeToggle moved to the nav; per-card Delete, comment moderation, and the unverified feed view only appear when dev mode is on.

## v0.102 — 2026-06-16

### Added
- **Admin role** (`profiles.is_admin`, granted to the operator; `public.is_admin()` helper) with RLS policies to select/delete any sighting, delete any comment, and delete any sighting photo.
- **Moderation UI**: per-card Delete (admin) via `deleteSighting` server action (removes photo + row); per-comment delete (admin or author) in `Comments`.
- **Dev mode** (`skydex_dev` cookie, admin only): feed reads the RLS-respecting `all_sightings` view to include unverified sightings, with a Verified-only filter and a `DevModeToggle`.
- `getViewer()` helper returning user + handle + admin flag.

## v0.101 — 2026-06-16

### Added
- **Global feed** (`/feed`): everyone's verified sightings via a privacy-safe `feed_sightings` SECURITY DEFINER view (no precise GPS exposed), newest-first, with the spotter's `@handle`.
- **Comments** (`comments` table, RLS public-read / insert-own): collapsible thread + add-box on each feed card, using the browser Supabase client directly. Commenter shown by `@handle`.
- **Search + filtering**: reusable `SightingBrowser` (free-text search over registration/callsign/type/airline/handle + aircraft-type pills) on both the feed and the scrapbook; scrapbook adds a Verified-only filter.

## v0.100 — 2026-06-16 (first public release)

### Added
- **Versioning + release log**: `lib/releases.ts` (starts at 0.100); the home screen now shows the full version history and published changes.
- **Username required**: the proxy redirects authenticated users without a handle to `/profile` before they can use Spot/Scrapbook.
- Editable profile (username + home airport) with uniqueness + format validation (`app/profile`).
- Capture **time** (not just date) shown on scrapbook cards.

## 2026-06-16 — Phase 0b.2a: deployed + flight-data source fix (skydex/)

### Changed
- **Flight data source switched OpenSky → airplanes.live** (primary), with adsb.lol and OpenSky as fallbacks (`lib/aircraft.ts`). Reason: OpenSky firewalls datacenter/cloud IP ranges, so its API is unreachable from Vercel functions (ConnectTimeoutError) — it works only from local dev. airplanes.live/adsb.lol are free, keyless, cloud-reachable, and additionally return **registration + ICAO type + description**, closing the proposal's enrichment gap. OpenSky OAuth creds retained as fallback (work locally).
- Forced IPv4 via an `undici` dispatcher (cloud egress IPv6 black-hole) and added a per-provider fallback chain.
- Sightings now store `registration` + `aircraft_type`; Spot UI shows them.

### Added
- Deployed to Vercel production: **https://skydex-two.vercel.app** (region `fra1`, env vars set).

### Verified
- Production `/api/flights` returns live traffic from airplanes.live (30 aircraft near Heathrow with registration/type/geometry).

### Pending
- **Supabase auth URLs** (so sign-in works on the deployed site) — see steps below.
- **On-device test** of camera/compass targeting (the 0b.2 acceptance gate).


## 2026-06-16 — Phase 0b.2: capture-verify core + brand (skydex/)

### Added
- **Brand applied** from `files/` (field-logbook identity): design tokens in `globals.css` (paper/ink/sky-teal/stamp-vermilion/brass + rarity scale), three typefaces (Saira Condensed / Source Serif 4 / IBM Plex Mono), and brand button styles. Re-skinned TopNav, landing, login, section shell.
- `lib/geo.ts` — haversine distance, initial bearing, elevation angle, angular diff.
- `lib/opensky.ts` — OpenSky access with OAuth2 client-credentials (cached) and anonymous fallback.
- `app/api/flights` — proxies OpenSky for a bounding box around the observer and returns candidates with server-computed bearing + elevation.
- `app/api/sightings` — auth'd POST; uploads photo to Supabase Storage and inserts a sighting.
- `app/spot` — live capture UI: geolocation + device-orientation (compass heading + pitch), camera via getUserMedia, targeting reticle highlighting the in-sights aircraft, Capture (verified, with photo) and Log-from-map (casual) actions.
- Supabase migration `create_sightings_and_storage`: `sightings` table (RLS own-only) + public `sightings` storage bucket with per-user upload policy.

### Verified
- `npm run build` green (13 routes, TS clean).
- `/api/flights` returns real live traffic (60 aircraft near Heathrow with correct geometry; `authenticated:false` anonymous fallback working).

### Pending
- **On-device acceptance test** (the 0b.2 gate): requires HTTPS deploy + a real phone under a live flight path to validate camera/compass targeting and tune tolerances.
- OpenSky creds optional (raise rate limits); `vercel login` for deploy; Supabase redirect URLs for magic-link.


## 2026-06-16 — Phase 0b.1: Scaffold + auth + shell (skydex/)

### Added
- Next.js 16 + React 19 + Tailwind v4 app scaffolded into `skydex/` (TypeScript, App Router).
- Supabase wiring: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server, async cookies), `lib/auth.ts` (`getUser`).
- `proxy.ts` — Next 16's renamed middleware; refreshes the Supabase session and redirects unauthenticated users from `/spot`, `/scrapbook`, `/profile` to `/login`.
- Magic-link auth: `app/login` (form + `signInWithEmail` server action via `signInWithOtp`), `app/auth/callback` (code → session exchange), `app/auth/signout`.
- App shell: dark "logbook" theme in `globals.css`, `TopNav` (auth-aware), landing page, and stub pages for Spot / Scrapbook / Feed / Profile.
- Supabase migration `create_profiles`: `profiles` table (RLS, public read) + trigger auto-creating a profile row on signup.

### Verified
- `npm run build` green (all 9 routes compile, TS passes); runtime smoke test: landing 200, `/feed` public 200, `/scrapbook` → 307 redirect to `/login`.

### Pending
- **Deploy:** needs `vercel login` (CLI token invalid).
- **Magic-link email:** add `http://localhost:3000/**` (and the Vercel URL once deployed) to Supabase → Auth → URL Configuration → Redirect URLs.
- **0b.2:** OpenSky `OPENSKY_CLIENT_ID` / `OPENSKY_CLIENT_SECRET` (placeholders in `.env.local`).


## 2026-06-16 — Phase 0a: SkyCards community research (skydex/)

### Added
- `research/skycards-community.md` — cited research note mining SkyCards' public reception (App Store/Play reviews, Infinite Flight forum, press). Ranked complaints, feature-request analysis, willingness-to-pay signals, engagement hooks to preserve, and SkyDex implications.
- `SPEC.md` — MVP feature spec for the Phase 0b web app; every line traces to a research finding, with an explicit not-in-MVP cut.
- `CHANGELOG.md` — this file.

### Findings (headline)
- **Real-camera demand confirmed** in reviews and forums, but it is the strongest *differentiation wedge* rather than provably the single loudest request — cost/complexity complaints appear more often.
- **The Season 1 reset** (locking earned cards, stricter coin rules) caused the biggest revolt; Flightradar24 reversed it and removed seasons on 24 Sep 2025. → SkyDex hard rule: never reset/devalue an earned collection.
- **"Intrusive ads" not corroborated** — the real monetisation grievance is cost/coin inflation, not advertising. Dropped ads framing from positioning.
- SkyCards sits at **~3.5/5 over ~1,469 ratings** — engaged but divided; the goodwill gap is the opportunity.

### Notes
- Reddit threads were sought but not surfaced by available search; not used as a source.
- Phase 0b (the Next.js + Supabase web app) is gated on user review of this spec and the one-time setup (Supabase MCP, Vercel, OpenSky OAuth2 creds).
