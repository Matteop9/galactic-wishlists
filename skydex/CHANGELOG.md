# SkyDex — Changelog

> **Releases:** user-facing version log lives in `lib/releases.ts` and renders on the home screen. On every published release, bump `CURRENT_VERSION`, prepend a `RELEASES` entry, and mirror it here. Versioning is **semantic MAJOR.MINOR.PATCH** (patch = feature/fix in-phase; minor = phase milestone e.g. 0.3.0 native app; major = public launch). Early `v0.10x` entries below were renumbered to `0.1.x`.

## v1.0.0 — 2026-08-26

**Public launch (V4 complete).** MAJOR bump per the versioning convention — this is the web release that accompanies the App Store submission. Content: the TestFlight feedback batch (26 Aug + two older queue items). Monetization remains dark (`ENFORCE_PAYWALL`/`ADS_ENABLED`/`PACKS_AVAILABLE` all false) until ~6 weeks post-launch.

### Fixed — stuck page zoom in the iOS shell (feedback 26 Aug)
- **`app/layout.tsx`** viewport: `maximumScale: 1` + `userScalable: false`. Page-level pinch zoom in the WKWebView could leave the app stuck zoomed-in with no way back; in-app zoom surfaces (MapLibre map, camera pinch, lightbox) have their own gesture handlers and are unaffected. Safari on the open web ignores the hint, which is fine.

### Fixed — compass empty on first open (feedback 26 Aug)
- **`app/spot/page.tsx`**: the orientation listener now attaches on mount (registration never needs permission — events are gated at delivery), and if the silent `DeviceOrientationEvent.requestPermission()` is refused for lack of a user gesture (iOS Safari AND the shell's webview), the FIRST tap anywhere (`click`/`touchend`, once, capture) retries with the gesture in hand. Previously Spot opened on the map with an empty facing cone until the user happened to open the Camera.

### Added — "why isn't this verified?" (feedback 19 Jul)
- **`components/SightingCard.tsx`**: `Sighting` gains `verify_fail_reason`; `SightingSpecs` renders a `STATUS UNVERIFIED — <friendly reason>` row plus a one-line explanation of what verification checks (own cards + lightbox only — the public feed is verified-only and its views don't carry the column). `verifyFailText()` maps the server's terse reasons (`not_airborne`/`no_position`/`distance…`/`heading|cone|pitch…`) to actionable sentences.
- **`app/scrapbook/page.tsx`**: selects `verify_fail_reason` for own rows.

### Added — personalisable profile banner (feedback 25 Aug)
- Migration **`profile_cover_theme`** (tracked in `supabase/migrations/`): `profiles.cover_theme` text default `'day'`, CHECK-constrained to `day|sunset|night|gold`.
- **`lib/coverThemes.ts`**: the four preset skies + `coverGradient()`; **`app/u/[handle]/page.tsx`** paints the cover band from the profile's theme (chart-paper art unchanged); **`components/CoverThemePicker.tsx`** in Settings (optimistic, reverts on error) via new `updateCoverTheme` action in `app/profile/actions.ts` (server-validated against the theme keys).

### Notes
- Swipe-down refresh (also in the 26 Aug feedback) ships natively: the shell's `UIRefreshControl` (v0.5.2 follow-up) is in the icon/entitlements Codemagic build — no web change.
- Feedback rows addressed by this release marked resolved in the `feedback` table; still open (deliberately): review-threshold scaling note, airline logos in scrapbook (licensing), "GPS recalibration" (too vague — ask), open-source suggestion.

## v0.5.4 — 2026-08-26

**App Store pre-flight (V4 Phase 6 hardening + native launch assets).** Everything code-side that had to happen before the public v1.0.0 submission, shipped as one batch: real app icon/splash, Universal Links, error boundaries + monitoring, abuse hardening, and store-safe Tickets copy. Monetization (RevenueCat/AdMob/paywall flip) is deferred until ~6 weeks post-launch.

### Added — native launch assets (needs a new Codemagic build)
- **App icon + splash**: replaced the stock Capacitor placeholders in `ios/App/App/Assets.xcassets` with the SkyDex luggage-tag mark (1024×1024 icon, 2732×2732 splash ×3, both 24-bit no-alpha, rendered from the same vector art as `app/apple-icon.tsx` via sharp).
- **Universal Links**: `public/.well-known/apple-app-site-association` (appID `ZA2J8HGL4V.com.skydex.mobile`, `/api/*` + `/auth/*` excluded) served as `application/json` via a `headers()` rule in `next.config.ts`; `proxy.ts` matcher now skips `/.well-known/`. iOS side: `ios/App/App/App.entitlements` (`applinks:sky-dex.com`) wired as `CODE_SIGN_ENTITLEMENTS` in both build configs. ⚠️ User steps: enable Associated Domains on the App ID at developer.apple.com, regenerate the "SkyDex distribution" provisioning profile, re-fetch in Codemagic.

### Added — error boundaries + monitoring
- **`app/error.tsx` + `app/global-error.tsx`**: branded "Turbulence" boundaries (retry + back-to-base; global one is inline-styled since it replaces the root layout). Both report via `lib/reportClientError.ts` → `POST /api/client-error` (unauthenticated by design, 5/min/IP + hard field caps).
- **`lib/monitor.ts` + `instrumentation.ts`**: every uncaught server error (`onRequestError` — RSC render, route handler, server action, proxy) is console-logged for Vercel logs and, when `SENTRY_DSN` is set, forwarded to Sentry as a bare envelope — no SDK dependency, no build-time plugin, no-op without the env var. ⚠️ User step: create a Sentry project and `vercel env add SENTRY_DSN` to activate alerts.

### Changed — abuse hardening (migrations `launch_abuse_hardening` + `review_unvote_anon_revoke`, tracked in `supabase/migrations/`)
- `sightings` storage bucket: `allowed_mime_types` = jpeg/png/webp + 8 MB `file_size_limit` enforced by the storage API (a direct anon-key upload can no longer host non-image content); upload policy also requires an image file extension.
- `feedback`/`reports`: DB-enforced per-user throttles (5/hr, 20/hr) via SECURITY DEFINER triggers (covers the direct client-insert path, not just the UI); `reports.reason` capped at 500 chars (`ReportButton` slices to match).
- Admin server actions (`app/actions/admin.ts`): explicit `is_admin()` guards on `resolveReport`/`resolveFeedback`/`resolvePhotoFlag`, owner-or-admin check in `deleteSighting` — RLS regressions now fail loudly instead of silently no-opping.
- Advisors: `search_path` pinned on `epoch_seconds`/`rarity_rank`/`rarity_floor`; `handle_new_user` EXECUTE revoked from API roles; `review_unvote` EXECUTE revoked from anon/PUBLIC (kept for authenticated). Remaining advisor items are known-intentional (SECURITY DEFINER feed views, user-callable RPCs) or user-dashboard actions (leaked-password toggle — moot once the Email provider is disabled at v1.0).

### Changed — store-safe Tickets page
- New `PACKS_AVAILABLE = false` flag in `lib/tickets.ts`: the Ticket-packs section and Frequent Flyer price/upgrade copy render nothing until RevenueCat IAP ships — a purchasable-looking pack the app can't sell is an App Store guideline 2.1 rejection risk, and "coming to Google Play" copy violated 2.3.10. Non-FF card now pitches the Founding Flyer freebie instead.

## v0.5.3 — 2026-08-25

**Loading states everywhere** — instant skeletons on navigation, a branded spinner, and honest map wait states. Previously route changes rendered nothing until the server responded, and an empty Spot map was indistinguishable from a still-loading one.

### Added — loading primitives
- **`components/Loading.tsx`** — the app's loading language, server- and client-safe:
  - `PlaneSpinner` — the map key's narrowbody jet circling a dashed range ring (tones: `ink` for paper surfaces, `paper` for dark ones).
  - `Skeleton` — paper-deep placeholder block with a soft light sweep.
  - `SpinnerBlock` (spinner + uppercase label) and `SectionLoading` (SectionShell with a real title over placeholder copy — the title renders instantly so the user knows where they landed).
- **`app/globals.css`** — `.sd-spin` / `.sd-skeleton` keyframes; under `prefers-reduced-motion` the spinner fades instead of rotating and the skeleton sweep stops.

### Added — route `loading.tsx` files (instant loading UI on every navigation)
- Layout-matched skeletons: `app/feed/`, `app/scrapbook/`, `app/leaderboards/`, `app/u/[handle]/`, `app/liveries/`, `app/review/`, `app/tickets/`, `app/settings/`, `app/s/[id]/`.
- Spinner pages: `app/loading.tsx` (root fallback), `app/books/`, `app/u/[handle]/books/` ("Opening the book…"), `app/feedback/`, `app/reports/`.

### Changed — Spot map wait states (`app/spot/page.tsx`, `components/SpotMap.tsx`)
- SpotMap covers itself with a "Loading map…" spinner (z-10, solid ink) until the maplibre `load` event — no more blank dark box while the basemap style/tiles fetch.
- "Waiting for location…" is now a spinner block, not bare text.
- New `mapSwept` state (set by the first successful wide-radius `/api/flights` sweep) drives a bottom-center chip on the map: "Scanning the sky…" with a mini spinner before the first sweep, "No aircraft in range right now" after it when the sky is empty. The chip carries no z-index by design so SpotMap's load overlay covers it.

### Changed — client "Loading…" texts upgraded to the spinner
- `components/LeaderboardBoard.tsx`, `components/ReviewQueue.tsx`.

## v0.5.2 — 2026-08-25

**Spot opens on the map, permission gate removed** — first feedback from the native shell (TestFlight spike passed same day: OAuth, camera, compass, GPS, capture all working in the WKWebView).

### Changed — `app/spot/page.tsx`
- **Default view is now the map** (was camera). The map needs only GPS, which starts on mount with no user gesture — so Spot renders useful content immediately.
- **The full-page "Allow camera & motion" gate is gone.** The old `phase: idle|active` state (which hid the whole page behind a button because iOS requires a user gesture for `DeviceOrientationEvent.requestPermission()`) is replaced by a `camera: off|starting|on` lifecycle scoped to the camera alone. The tap that opens Camera view (toggle, map "Track & aim", or the "Open camera to capture" button) doubles as the permission gesture. A silent motion-permission attempt runs on mount so environments that don't need a prompt (Android, desktop, the native shell) get a live compass with zero taps; where iOS insists on a gesture, the Camera tap retries.
- Camera view shows a "Starting camera…" / "Open camera" panel until the stream is up; the capture button becomes "Open camera to capture" while the camera is off. Sensor teardown consolidated into the mount effect's cleanup.
- **Native shell note:** Capacitor 8's `WebViewDelegationHandler` auto-grants both WKWebView permission callbacks (`requestMediaCapturePermissionFor`, `requestDeviceOrientationAndMotionPermissionFor`), so in the iOS app there are no repeat permission prompts at all — the recurring screen users saw was purely this web gate. No native change needed; hosted mode ships this fix to the installed app instantly.

### Follow-up — native pull-to-refresh in the iOS shell (same day, no version bump per user call)
- **`ios/App/App/SceneDelegate.swift`**: new `SkyDexBridgeViewController` (subclasses `CAPBridgeViewController`, used as the window's root VC) attaches a `UIRefreshControl` to the webview's scroll view — swipe down from the top of any page to reload it. `alwaysBounceVertical` so the pull works on pages shorter than the screen; spinner ends on a 1 s timer while the reload visually takes over. Touch-owning regions (Spot map/camera, `touch-none`) can't trigger it, by design. Also closes the old "refresh feed control" backlog quick-win for app users. **Native change → needs a new Codemagic/TestFlight build**; web deploys can't deliver it.

## v0.5.1 — 2026-08-25

**Capacitor iOS shell + Codemagic TestFlight pipeline (V4 Phase 5 kickoff).** The native iOS app exists: a Capacitor 8 hosted-mode shell (`server.url: https://sky-dex.com` — the web app stays the product; web deploys update the app instantly) wired to a cloud CI pipeline that signs and uploads to TestFlight. No web-visible changes beyond the release note.

### Added
- **`capacitor.config.ts`**: appId `com.skydex.mobile`, appName SkyDex, hosted-mode `server.url` + `allowNavigation` covering sky-dex.com, the Supabase auth host, `accounts.google.com`, and `appleid.apple.com` so the OAuth redirect chain stays inside the webview.
- **`www/index.html`**: stub webDir (required by `cap sync`; unused at runtime in hosted mode).
- **`ios/`**: Capacitor-generated Xcode project (Capacitor 8 = Swift Package Manager, no CocoaPods). Bundle id `com.skydex.mobile`, iOS 15 deployment target, MARKETING_VERSION 1.0 (native shell versions independently of the web app; build number set by CI). `Info.plist` gains the three permission strings the spotting mechanic needs: `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`, `NSMotionUsageDescription`.
- **`codemagic.yaml`** (at the **repo root** — Codemagic only discovers it there): workflow `skydex-ios` on a free-tier M2 Mac — `npm ci` + `cap sync ios` in `skydex/`, automatic signing via the Codemagic App Store Connect integration named `SkyDex` (`ios_signing: app_store` for `com.skydex.mobile`), `agvtool` build number from `PROJECT_BUILD_NUMBER`, `xcode-project build-ipa`, publish `submit_to_testflight`. Manual trigger only (shared monorepo).
- Deps: `@capacitor/core` + `@capacitor/ios` (runtime), `@capacitor/cli` (dev).

### Notes
- First TestFlight build requires the App Store Connect **app record** (name SkyDex, bundle `com.skydex.mobile`) to exist before the publish step.
- The TestFlight spike checklist (camera/compass/GPS/OAuth/offline queue inside the WKWebView) decides whether the hosted-shell bet holds — known risk: Google OAuth can refuse embedded webviews (`disallowed_useragent`); fallback is a native auth/browser plugin.

## v0.5.0 — 2026-08-25

**Store-grade auth (V4 Phase 4 milestone).** Sign-in is now **Google + Apple only**; the email magic-link path is gone. Apple side configured same day: App ID **`com.skydex.mobile`** (canonical, hyphen-free — doubles as the future Capacitor/Android id), Services ID `com.skydex.mobile.web` (domain + return URL on the Supabase project), SIWA key `X68BQN3W5M`, client secret generated locally (PyJWT ES256; **expires 2027-02-21** — regenerate from the .p8 before then), Supabase Apple provider enabled.

### Changed
- **`app/login/page.tsx`**: full rework — Google (primary) + **Sign in with Apple** (black button, inline Apple-mark SVG; the  glyph is tofu off Apple devices) via one shared `signInWithOAuth` path; email form + divider removed. The callback's `?error=auth` bounce is now surfaced ("That sign-in didn't complete") instead of dead-ending silently (review items U9/U10); per-provider pending labels.
- **`app/auth/callback/route.ts`**: error redirect now carries the validated `next` so a retry keeps its destination; comment updated (OAuth PKCE, not magic-link).
- Copy sync: `app/privacy/page.tsx` (email comes from your Google/Apple account), `README.md`, `SPEC.md` (Apple/Google marked shipped).

### Removed
- **`app/login/actions.ts`** (magic-link `signInWithEmail` server action) — closes the "unauthenticated email-send, no throttle" review item by removing the surface entirely.

### Notes
- **4 email-only accounts existed at cutover** (1 gmail, 2 external, 1 owner test account): they keep their logbooks by signing in with Google or Apple **on the same email address** (Supabase auto-links verified same-email identities). The Supabase **Email provider stays enabled as a transition backstop** (no UI path reaches it); disable it in the dashboard at v1.0 along with the leaked-password advisor item.

## v0.4.2 — 2026-08-24

**Custom domain: sky-dex.com (V4 Phase 2 infra).** Domain purchased by the user, delegated to Vercel nameservers (ns1/ns2.vercel-dns.com), attached to the project (apex + www). `NEXT_PUBLIC_SITE_URL=https://sky-dex.com` set in Vercel production — flips metadataBase/canonical, robots, sitemap, and the magic-link redirect (all already read the env; only fallbacks reference the old host). Google OAuth is origin-based so both domains sign in regardless. The old skydex-two.vercel.app URL keeps serving (nothing redirects yet).

### Changed
- **`app/api/aircraft-photo/route.ts`**: Planespotters User-Agent contact URL → sky-dex.com (last hardcoded old-domain reference).

### Manual (dashboard) — Supabase Auth → URL Configuration
- Site URL → `https://sky-dex.com`; add `https://sky-dex.com/auth/callback` to Redirect URLs (keep the skydex-two entries). Until done, sign-ins started on the new domain land back on the old one (allowlist fallback) — degraded, not broken.

### Follow-up — old domain + www now redirect (user: "flip it")
- **`next.config.ts`**: host-based 308s — `skydex-two.vercel.app/*` and `www.sky-dex.com/*` → `https://sky-dex.com/*` (path + query preserved, so old `/s/[id]` share links resolve). Config redirects run before proxy.ts, so no auth round-trip on the legacy host. Known one-time costs: legacy-domain sessions don't carry over (one re-sign-in; the redirect hop also self-heals the allowlist fallback — the auth code bounces back to the origin holding the PKCE cookie), and PWAs installed from the old domain should be reinstalled from sky-dex.com. Chose config-level redirects over the dashboard "Redirect to" toggle so the cutover is versioned in the repo.

## v0.4.1 — 2026-08-24

**V4 Phase 2 (commercial licensing + infra) — the code half.** The live feed now rides a commercial-safe failover chain, the last open API endpoint is authed and throttled, and the attributions/licence docs match reality again. The rest of Phase 2 is account actions (custom domain, Vercel Pro, Supabase Pro, analytics toggle, error monitoring).

### Changed — live feed becomes an adsb.lol-primary failover chain
- **`lib/aircraft.ts`**: single-source adsb.fi → provider chain **adsb.lol (ODbL, commercial-safe) → adsb.fi → airplanes.live**, each a name + two URL builders over the same readsb JSON. A provider that errors goes into a cooldown so polls during an outage fail over instantly instead of re-paying its timeout (per-instance state, like the FR24 airline cache; a repeat of the v0.3.17 single-provider outage now costs seconds, not the app). **Two cooldown tiers:** hard failure (403/5xx/timeout/DNS) = 60 s, **429 = 5 s** — measured 2026-08-24: adsb.lol rate-limits ≈1 req/s per IP with a small burst (sustained overage escalates to a temporary connection-level block), which one spotter's sweep + fast-poll can graze; a 60 s exile per 429 would have pushed most traffic onto the non-commercial fallbacks. The area sweep treats a valid-but-empty answer as real (quiet sky ≠ failover). The **hex lookup falls through on empty/positionless answers** for a second opinion before ruling "not airborne" — coverage gaps differ per network and a false negative marks an honest catch unverified; `unavailable` only when every provider errored. `HexLookup` gains `source` (the provider that supplied the verdict). Chain behaviour verified against the live APIs (happy path on adsb.lol; hard-failover + 429 + all-providers-cooling paths all exercised for real).
- **`typeDesc` fallback**: adsb.lol serves no `desc`, so the human type name now falls back to our own `lib/aircraftTypes.ts` map (kills the v0.2.2 "bare codes" blocker that kept adsb.lol off primary; the map has been the persisted-name source since v0.2.7).
- **`app/api/flights/route.ts`** hex mode reports the provider that actually answered (was hardcoded `adsb.fi`). `scripts/rarity-snapshot.mjs` already ran adsb.lol-primary — unchanged.

### Changed — /api/flights hardened (closes a HIGH from the 2026-08-24 review)
- **Signed-in only**: `getUser()` gate → 401. The sole consumer (`/spot`) is proxy-authed anyway; the open endpoint was a free scraping proxy for the upstream feeds from our egress IPs.
- **Per-user rate limit** 150/min (organic worst case ≈ 50/min: 6 s sweep + 2 s locked fast-poll + map open together) → 429; in-memory per instance — an abuse damper, not a quota. Success responses get `Cache-Control: private, max-age=2`.
- Client impact: none — the spot page already treats any non-OK poll as a transient feed error (keeps last candidates, shows "reconnecting…").

### Changed — attributions + licence audit refreshed
- **`app/attributions/page.tsx`**: live-data section lists the chain (adsb.lol with an explicit ODbL credit, adsb.fi, airplanes.live); **Flightradar24 credited for persisted card data** (was missing entirely); own-compilation type names noted; dead **adsbdb** and **Kiwi.com logo** sections removed; the stale "early, non-commercial project" line dropped.
- **`research/data-licences.md`**: re-audited — adsb.lol §1 PRIMARY ✅, adsb.fi §2 fallback-only ⚠️, adsbdb §3 marked REMOVED (the 🚩 route-persistence flag was closed by v0.2.6's FR24 switch; the doc still showed it open), new §6 Flightradar24, TL;DR + review date updated.

### Removed
- **`lib/airlines.ts`**: dead `AIRLINE_IATA` map + `airlineIata`/`airlineLogoUrl` (Kiwi.com logo CDN helpers) — nothing has rendered them for several versions, and hotlinking a third-party logo CDN was a flagged licensing risk for a commercial product.
- Comment/docs sync: `README.md` stack line, `lib/fr24.ts` architecture note, `/api/sightings` licence comment.

## v0.4.0 — 2026-08-24

**The Tickets economy (V4 Phase 3 milestone), dark-launched.** Full freemium currency — append-only ledger, grants, review-to-earn, spend gate, balance UI — plus the **Frequent Flyer** premium tier and ad plumbing. Two feature flags in `lib/tickets.ts` keep it harmless today: `ENFORCE_PAYWALL = false` (nobody is blocked or charged — no 402, no spending) and `ADS_ENABLED = false` (every AdSlot renders nothing). Flip both at native launch (Phase 5/6). Design: `docs/tickets-economy-plan.md` (untracked) — D1-A/D2 8-50-150/D3-B/D4 daily+review/D6 UTC/D7 flag-off, plus Frequent Flyer £4.99 lifetime **included free for all 2026 signups ("Founding Flyers")**.

### Added — database (7 migrations, now also tracked in `supabase/migrations/`)
- **`ticket_ledger`** (migration `ticket_ledger`): append-only currency ledger, balance = `sum(delta)`; reasons `welcome|daily_grant|spend_capture|purchase|review_reward|ad_reward|admin_adjust|refund` (`ad_reward` reserved for Phase-5 rewarded ads). RLS read-own only, **no client write policies**; idempotency partial uniques: one welcome ever, one daily grant per UTC day (expression index on `(created_at at time zone 'utc')::date`), one purchase per txn, one review reward / spend / refund per (user, sighting).
- **Frequent Flyer** (migration `frequent_flyer_tier`): `profiles.frequent_flyer` + `_since` + `_source ('founder'|'purchase'|'admin')` + `_txn`; backfilled all 15 existing profiles as founders; `feed_sightings`/`all_sightings`/`shared_sightings` views + `leaderboard()` RPC (drop+recreate — return shape changed) now carry `frequent_flyer`; `grant_frequent_flyer(p_user, p_txn)` **service-role only** (Phase-5 webhook; user-callable would be a free-upgrade hole).
- **Ticket RPCs** (migrations `ticket_rpcs` + `ticket_status_volatile`): `ticket_status()` (balance, spots/captures today by `captured_at` ≥ UTC midnight, tier config — the client displays what the DB enforces, so UI can't drift), `claim_daily_tickets()` (grant-on-read: lazy founder grant for 2026 signups + one-time 150 welcome + daily top-up toward the rollover cap, 8/day cap 50 — FF 16/day cap 100; zero-amount days insert nothing; no cron), `spend_ticket(p_sighting)` (ownership-checked, balance-guarded, idempotent per sighting), `redeem_purchase(p_user, p_txn, p_qty)` (**service-role only**, idempotent on txn). All SECURITY DEFINER, `search_path 'public'`, per-user `pg_advisory_xact_lock` serialisation. Status functions made VOLATILE (STABLE read a stale snapshot when composed with writes in one statement).
- **Review-to-earn** (migration `review_vote_ticket_reward`): `review_vote` v2 awards +1 Ticket per fresh review inline (no separate client-callable award RPC = no farming surface), capped 10/UTC-day (FF 20), once per sighting ever (unvote→revote can't re-earn); returns `earned`/`tickets_today`/`review_cap`. Feed ❓ votes earn too (they ARE reviews; ≥5-verified gate + caps apply).
- **Refund trigger** (migrations `ticket_refund_on_delete` + `ticket_trigger_fn_lockdown`): `after delete on sightings` refunds a spent Ticket exactly once (retake/self-delete/admin-delete can't eat a paid Ticket); FK-violation guard for account-deletion cascades; direct-RPC EXECUTE revoked.
- All RPC behaviours probe-verified via `execute_sql` in rolled-back transactions before any app code (welcome/daily idempotency, cap resume at 16 FF / 8 non-FF, spend guards, review dedupe + cap, RLS insert denial 42501, redeem lockdown + txn dedupe, refund trigger).

### Added — app
- **`lib/tickets.ts`** (new): every knob in one file (20 free spots/day, 8/day grant, cap 50, welcome 150, review 1×10/day; FF £4.99 / cutoff 2027-01-01 / 2× / 100 / 20; packs 10-£0.99 · 50-£2.99 · 150-£6.99) + `ENFORCE_PAYWALL` / `ADS_ENABLED` flags + `TicketStatus`/`CaptureTickets` types + the `skydex:tickets-changed` event helper. Constants mirrored in the SQL with sync comments both sides.
- **`components/TicketChip.tsx`** (new): header balance chip (plane-ticket glyph from the avatar set); mounting it claims the daily grant (grant-on-read); listens for `skydex:tickets-changed`; links to `/tickets`. Mounted in `TopNav` next to `UserMenu`.
- **`app/tickets/page.tsx`** (new): balance + spots-today hero, how-you-earn rows (daily / review link / welcome), Frequent Flyer membership card (Founding Flyer callout) or the £4.99 pitch with "upgrade in the app" stub, IAP pack previews ("buy in the app"), and the ledger history (RLS-scoped, friendly labels, newest 50). `/tickets` added to `proxy.ts` PROTECTED + the Profile tab's `also` list.
- **`components/FlyerStar.tsx`** (new): brass ✦ after the handle, inside the handle `<Link>` (AGENTS.md one-target rule). Wired wherever handles render with `is_admin` today: `SightingSpecs` + compact card (`SightingCard.tsx`), `Comments` (profiles select + type), `LeaderboardBoard`, `/u/[handle]` header; `frequent_flyer` threaded through feed `COLS`, `/s/[id]` select, and `lib/profileSightings.ts` `SIGHTING_COLS`.
- **`components/AdSlot.tsx`** (new, dark): placements mounted at the Phase-5 ad points — feed (above the browser; will interleave ~every 8 rows when live), post-capture (inside `DiscoveryMoment`), rewarded (`/tickets`). Renders `null` while `ADS_ENABLED` is off or the viewer is FF. No banners; nothing on the camera.

### Changed
- **`app/api/sightings/route.ts`**: after photo validation (before the live-feed + paid FR24 calls) it reads `ticket_status()` once; **unconditional abuse ceiling** `ABUSE_DAILY_CAP = 200` captures/UTC-day → 429 (closes the open "no per-user FR24 daily cap" security item; counts ALL captures, so unverified spam is capped too); when `ENFORCE_PAYWALL`: ≥20 verified spots today + balance 0 → **402** `{code:"out_of_tickets"}`, and a verified capture beyond the free line calls `spend_ticket` post-insert (a lost spend race logs and keeps the sighting — never unwind a real catch over accounting). Response gains `tickets: {balance, spentTicket, spotsUsedToday, freeSpotsPerDay, frequentFlyer}`.
- **`app/spot/page.tsx`**: HUD line "Spots today N/20 · 🎟 M" (from `ticket_status`); successful captures update it + dispatch `skydex:tickets-changed`; **402** shows the soft wall (earn paths: review link, /tickets link, "get more in the app") and banks the catch in the offline queue; the queue flusher treats 402 as retryable (tomorrow's grant settles it) alongside 429/5xx.
- **`components/DiscoveryMoment.tsx`**: ticket footer line ("Free spot 12/20 today" / "1 Ticket used · N left") + the post-capture AdSlot point; `DiscoveryResult` gains `tickets`.
- **`components/ReviewQueue.tsx`**: "+1 Ticket earned" flash + "Tickets earned today: X/Y" from the vote response; announces the change so the header chip updates.
- **`app/api/export/route.ts`**: GDPR export now includes the user's `ticket_ledger` (FF fields ride along on the profile row).
- **`SPEC.md`**: monetisation rules updated to the V4 model (was "No ads" / "one-off Pro unlock"): no banners ever + nothing on the camera; rewarded/interstitial for free users from native launch; Frequent Flyer removes ads; progression still never purchasable — Tickets only buy extra capture attempts.

## v0.3.22 — 2026-08-24

Offline capture queue (spotting fix item D). A catch taken with no signal — or when the upload times out / the server is briefly busy — is no longer lost: the photo + metadata are stashed on the device and uploaded automatically once you're back online.

### Added
- **`lib/captureQueue.ts`** (new): a small IndexedDB queue (`enqueueCapture` / `listCaptures` / `removeCapture` / `countCaptures`). Browser-only; blobs stored directly.
- **`app/spot/page.tsx`**: capture now has a hard 30 s upload timeout (`postCapture` via `AbortSignal.timeout`) so a stalled connection rejects instead of hanging on "Saving…" forever. On a network error / timeout / 429 / 5xx the catch is queued ("Saved — we'll upload… once you're back online"); a background flusher drains the queue on mount + on the `online` event (409 "already logged" = done; permanent 4xx dropped so they can't jam the queue). A "N waiting to upload" badge shows the backlog. New `grabPhotoBlob` guards a not-ready / backgrounded camera (kills the silent photo-less save). Genuine rejections (400/401/413/415) still surface as errors.

### Changed
- **`app/api/sightings/route.ts`**: `MAX_CAPTURE_AGE_MS` 10 min → 6 h so a late upload keeps its real shutter time on the card. Verification is unaffected (back-projects ≤120 s), so a long-delayed catch whose plane has moved on lands unverified → community review, never discarded.

## v0.3.21 — 2026-08-24

Brand-name display fix (found while shipping v0.3.20). `normalizeBrand` stripped a trailing country word even when it was part of the airline's real name — "Air France" showed as "Air", "TAP Air Portugal" as "TAP Air"/"TAP" on cards + the scrapbook Carriers grid.

### Fixed
- **`lib/airlines.ts`**: `normalizeBrand` keeps the region word when the part before it is (or ends in) "Air" — so "Air France" / "Air Malta" / "TAP Air Portugal" / "Wizz Air Malta" are preserved, while genuine AOC suffixes still consolidate ("easyJet Europe" → "easyJet").
- **DB migration `fix_normalizebrand_corrupted_airlines`**: backfilled the corrupted display brand on existing rows (AFR "Air" → "Air France" ×17; TAP "TAP"/"TAP Air" → "TAP Air Portugal" ×8) and removed the junk "Air"/"TAP"/"TAP Air" entries from the Carriers universe.

## v0.3.20 — 2026-08-24

Fixes the "it says a new airline then it isn't" whiplash (spotting fix item E). The map predicted airline-newness from `airlineFromCallsign(callsign)` while the server decided it from FR24's `operating_as` — two different resolutions of the same flight, so they disagreed on franchises/wet-leases (BA CityFlyer/Euroflyer, Malta Air-operated Ryanair). Both now key on the **stable ICAO callsign code**, so the pre-capture hint and the post-capture reward always agree. Brand names are unchanged as the display label.

### Changed
- **`lib/airlines.ts`**: new `callsignIcao(callsign)` → the 3-letter ICAO airline code (or null) = the newness key.
- **DB migration `add_airline_icao_to_sightings`**: nullable `sightings.airline_icao` + `(user_id, airline_icao)` index, backfilled from stored callsigns (768/786 rows).
- **`app/api/sightings/route.ts`**: persists `airline_icao`; the "new airline?" discovery probe + flag key on it (`seenBefore("airline_icao", …)`) instead of the FR24 brand.
- **`app/spot/page.tsx`**: the map's own-collection set + `newness()` key on `callsignIcao` (was the resolved brand); `collection.airlines` → `collection.airlineIcaos`. Scrapbook/leaderboard/display brand names untouched.

## v0.3.19 — 2026-08-24

Security hardening (part of the V4 "ready for real users" gate). No user-visible behaviour change; closes the highest-risk items from the 2026-08-24 review.

### Fixed — CRITICAL: FR24 credit-burn via rate-limit bypass
- **`app/api/sightings/route.ts`**: photo size + magic-byte validation now runs BEFORE the paid FR24 lookups (was after). The per-minute limiter counts inserted rows, so a request that failed photo validation created no row and wasn't throttled — a junk/oversized "photo" plus a registration could spam ~16-credit FR24 lookups for free (drainable in minutes). Validating up front makes that path cost 0 credits; the storage upload still happens last (failed-insert cleanup preserved). Storage errors no longer echo the raw provider message.

### Fixed — HIGH: verification could fail OPEN on a fabricated hex
- **`app/api/sightings/route.ts`**: `icao24` must now be a real 24-bit ICAO address (`^[0-9a-fA-F]{6}$`). The old `^[0-9a-fA-F~]{3,6}$` admitted `~`-prefixed / short non-ICAO values; a fabricated hex that upstream 4xx'd hit the "upstream unavailable → verified" branch and could mint a VERIFIED sighting of a non-existent plane. A malformed hex is now `null`, which skips the verification block entirely (stays unverified).

### Fixed — HIGH: Origin header trusted for the magic-link redirect
- **`app/login/actions.ts`**: the sign-in email link is built from a canonical `NEXT_PUBLIC_SITE_URL` (fallback `https://skydex-two.vercel.app`), not the request `Origin` header — a POSTed `Origin: evil.tld` could otherwise mint a magic link pointing at an attacker's host. Removed the now-unused `next/headers` import.

### Fixed — HIGH: local Claude settings could leak the FR24 token
- **`.gitignore`**: ignore `.claude/settings.local.json` (it embeds the FR24 bearer token in permission-allowlist strings); it was only kept out of the public repo by a machine-global ignore. ⚠️ The token should still be rotated in the FR24 portal.

## v0.3.18 — 2026-08-24

Close-range / dodgy-signal capture reliability (part 1 of the spotting fix). Field report: "the plane is on my screen but it says the direction is well off" + trouble "picking up planes when you're close or the signal is dodgy." Root causes are all client-side — all 623 sightings in the last 45 days are `verified` with zero `verify_fail_reason`, i.e. failures happen *before* the server ever sees a capture: capture was hard-gated on a fragile compass cone, pitch used a portrait-only formula, and any poll dropout blanked the list + dropped the lock. Offline queue (D), newness reconciliation (E) and fuller detection tuning follow in later releases.

### Changed — capture no longer blocked by the compass cone (fix A)
- **`app/spot/page.tsx`**: `inCone` stays the *aim assist* (green reticle / auto-match), but the button now enables via a new `canCapture` = in-cone **OR** locked **OR** within `CLOSE_CAPTURE_KM = 2` (mirrors the server's `VERIFY_CLOSE_RANGE_M`). New `nearestClose` fallback target = the single nearest candidate ≤2 km, so a plane you can see is capturable with no lock and a wrong compass. Label softens to "Capture {reg} — we'll check it" out of cone; the server still decides `verified`, and a bad aim lands unverified → community review. Tracking banner reworded.

### Changed — correct camera elevation in any orientation (fix B)
- **`lib/geo.ts`**: new `cameraElevation(beta, gamma) = asin(−cos β · cos γ)` — the rear camera's true elevation above the horizon, independent of screen orientation and non-degenerate at the zenith.
- **`app/spot/page.tsx`**: `onOrient` pitch now uses it (falls back to `beta − 90` only if gamma is missing). The old `beta − 90` was correct only held upright in portrait and 90–170° wrong in landscape / overhead — the direct cause of "it's right there but you're way off."

### Changed — signal resilience: never blank, never lie (fix C)
- **`app/spot/page.tsx`**: the sweep keeps the last good candidates through a network error or a valid-but-empty gap (clears only after `FEED_STALE_MS = 25 s` of genuine quiet); `feedError` surfaces "· reconnecting…" in the HUD. The lock is no longer dropped on one empty sweep — a `LOCK_GRACE_MS = 30 s` timer (fed by the sweep + the `hex=` fast-poll, which now re-adds a locked plane the sweep momentarily dropped) owns retirement. Empty-state copy distinguishes waiting-for-GPS / reconnecting / calibrate-compass / genuinely-empty.

### Changed — low aircraft detection (fix F, partial)
- **`app/api/flights/route.ts`**: `MIN_ELEVATION` 2 → 0 so low approach/fence traffic isn't filtered out before it can be locked (the elevation×range scaling still keeps distant low-angle cruisers out).

## v0.3.17 — 2026-08-14

Outage: airplanes.live began returning **403 to all unregistered API consumers** ("Please contact us at contact@airplanes.live…"), taking down the live map, the nearby feed, capture verification and the tracked-plane fast poll (every `/api/flights` call 502'd). Verified the 403 reproduces from multiple egresses — their policy change, not a Vercel IP block. CARTO basemap and all app code were fine.

### Changed — live feed swapped to adsb.fi
- **`lib/aircraft.ts`**: `fetchAircraftNear` → `opendata.adsb.fi/api/v2/lat/{lat}/lon/{lon}/dist/{nm}`, `lookupLiveByHex` → `opendata.adsb.fi/api/v2/hex/{hex}`; `source` string now `adsb.fi`. adsb.fi is readsb-shaped like airplanes.live and carries the full `desc` (the reason adsb.lol stayed unusable as primary), plus `ownOp`/`year` (unused for now). Quirk handled in `mapReadsb`: the point endpoint keys the array `aircraft`, the hex endpoint `ac`.
- **`app/api/flights/route.ts`**: hex-mode `source` string updated.
- **`scripts/rarity-snapshot.mjs`**: fallback source airplanes.live → adsb.fi (parser accepts both array keys).
- **Docs/comments**: `README.md`, `lib/fr24.ts`, `app/api/sightings/route.ts` license comment, `research/data-licences.md` §2 rewritten (adsb.fi terms: community open data, non-commercial lean, ≤1 req/s guidance — same acquisition caveat as before; airplanes.live marked removed with the option to email for approved access).
- **`app/attributions/page.tsx`**: live-data credit airplanes.live → adsb.fi.

## v0.3.16 — 2026-08-12

Feedback row @lgspotzplanez 2026-08-11 ("Escape button… put it below the picture and clearly identifiable button, not just text") + same-day user request to bring the zoom slider back alongside pinch.

### Changed — Lightbox close controls
- **`components/Lightbox.tsx`**: always-visible ✕ pinned top-right (`fixed`, not `absolute` — the container scrolls) + a labelled `Close` button (`sd-btn sd-btn--log`) directly below the picture; the "Tap background or press Esc to close" text hint removed. Background tap + Esc (`useDialog`) unchanged; the Planespotters attribution link stays (licensing) but is no longer the nearest tappable thing to the close affordance.

### Changed — zoom slider restored alongside pinch
- **`app/spot/page.tsx`**: the v0.3.15 `−/1.0×/+` chip replaced by the legacy `{zoom}× + <input type="range">` slider row (same markup as pre-0.3.15); pinch, double-tap reset and wheel zoom all stay. The slider container gets `touch-auto` (overrides the wrapper's `touch-none` so native drags work) and `onTouchStart` stopPropagation (slider taps must not feed the wrapper's pinch/double-tap handlers).

## v0.3.15 — 2026-08-11

Two feedback rows (in-app `feedback` table): @matteop9 2026-08-11 (overhead direction check "a lot a lot more relaxed" / faster polling for the tracked plane / pinch-to-zoom / superimposed calculated-position marker) and @matteop9 2026-07-29 (feed "difficult to digest", wants Instagram-style tap-through of what you've missed). Root causes: capture gating used two independent axis tolerances (azimuth degenerates near the zenith, so honest overhead captures failed a meaningless check), and candidates were polled every 6 s then treated as static while airplanes.live `seen_pos` is ~0.04–0.2 s — all staleness was our own poll gap.

### Changed — pointing checks become one true angular-separation cone
- **`lib/geo.ts`**: new `angularSeparation(az1, el1, az2, el2)` (spherical law of cosines — collapses to azimuth diff at the horizon, self-relaxes near the zenith), `signedAzimuthDelta` (−180…180), and `projectForward(lat, lon, track, speedMs, dtSec)` (flat-earth dead reckoning; negative dt back-projects).
- **`app/spot/page.tsx`**: `HEADING_TOL`/`PITCH_TOL` (22/22) → single `CONE_TOL = 25` on true separation; auto-match sorts by separation. Verified deterministically: 85° elevation with 90° of azimuth error = 7.1° separation (passes), horizon 30° azimuth error stays 30° (fails, as before).
- **`app/api/sightings/route.ts`**: `VERIFY_HEADING_TOL`/`VERIFY_PITCH_TOL` (60/45) → `VERIFY_CONE_TOL = 70`; missing heading still fails closed, missing pitch/elevation falls back to azimuth-only (preserves the old pass-open policy). The live sample is **back-projected to the shutter instant** (`projectForward` over `capturedAt − (now − seen_pos)`, guarded to ±120 s and track+velocity present) before computing geometry. `verify_fail_reason` shape: `cone 84 vs 70` replaces `heading …`/`pitch …` (nullable diagnostic; no migration).
- **`components/SpotMap.tsx`**: `FOV_HALF_ANGLE` 22 → 25 to keep mirroring the capture tolerance.

### Added — dead reckoning + tracked-plane fast poll
- **`lib/aircraft.ts`**: `seen_pos` plumbed end-to-end (`AcRecord` → `Aircraft.seenPosS` → `Candidate.seenPosS` → `HexLookup.seenPosS`); `HexLookup` also gains `callsign` and `velocityMs` (needed for server back-projection).
- **`app/api/flights/route.ts`**: new `hex=<icao24>` mode — resolves one aircraft via `lookupLiveByHex`, annotates with the same geometry, skips the cone filter, returns a one-item `candidates` array; `fetchedAt` added to responses.
- **`app/spot/page.tsx`**: candidates stored with per-candidate `sampleAt` (client receive time − `seenPosS`, avoiding server-clock skew); a 500 ms ticker + memo dead-reckons every candidate's lat/lon → bearing/elevation/distance between polls (raw fix kept for the overlay ghost). While a plane is locked, it's fast-polled via `hex=` every 2 s and merged over its sweep entry; the 40 km sweep stays at 6 s.

### Added — camera pinch-to-zoom + calculated-position overlay
- **`app/spot/page.tsx`**: two-finger pinch (ratio × gesture-start zoom, clamped to native caps or 1–4× digital, through the existing `applyZoom`), `touch-none` wrapper, wheel zoom for desktop, double-tap resets. The slider is retired for a `−  1.0×  +` chip (keyboard-accessible).
- **`components/TargetOverlay.tsx`** (new, presentational): projects the current target into screen space (`signedAzimuthDelta`/elevation offsets over `CAMERA_HFOV_DEG = 65` ÷ zoom — a deliberate tunable, no browser API exposes lens FOV); solid plane glyph at the dead-reckoned position rotated by track − heading, labelled `reg · km · °off`; faint ghost at the raw last fix (ahead/behind legible at a glance); off-screen targets clamp to the edge with a rotated chevron.

### Added — feed catch-up stories + compact cards
- **`app/feed/page.tsx`**: `created_at` added to `COLS`/`FeedRow`; browser gets `compact` + `catchUp` (catch-up only on Latest — Popular reshuffles old rows).
- **`components/FeedStories.tsx`** (new): full-screen ink viewer — progress pips, tap zones (left third back / right two-thirds forward), >40 px swipe, arrow keys, Esc via `useDialog`; slides reuse `SightingSpecs dark` + `Reactions` (new `dark` prop, keyed per slide) + `ShareButton`.
- **`components/SightingBrowser.tsx`**: `localStorage["skydex_feed_seen_at"]` high-water mark (ISO timestamp compared `>` — deliberately NOT the WeeklyReview date-stamp pattern); banner "N new catches since —— tap through →" ("50+" when every loaded row is unseen); first-ever visit seeds silently; closing the viewer advances the mark. New `compact`/`catchUp` props default off, so scrapbook is unchanged.
- **`components/SightingCard.tsx`**: `Sighting.created_at?` + `compact` prop — photo `h-40` → `aspect-[4/3]`, spec grid collapses to headline / type · airline / linked `@handle` / one mono line (rarity · route · time); rarity rail, stamps and badges stay. Full spec block stays one tap away in the shared Lightbox (AGENTS.md conventions 1+2 hold).
- **`components/Reactions.tsx`**: `dark` variant (border/text swaps + dark selected states), mirroring the `SightingSpecs` convention.

## v0.3.14 follow-up — 2026-08-03 (silent, no version bump)

Email sign-up restored by request — deliberately quiet: no `lib/releases.ts` entry, home screen stays on v0.3.14.

### Added — email magic-link sign-in back
- **`app/login/actions.ts` recreated** (deleted in v0.3.2): `signInWithEmail` server action → `supabase.auth.signInWithOtp` (creates the user on first sign-in; profile row via existing trigger). Improvement over the old version: the `next` param is now validated server-side with the same same-origin check as the page and `/auth/callback`.
- **`app/login/page.tsx`**: "or email" divider + magic-link form re-added below the Google button (sent-state panel, inline errors); kept the v0.3.2+ improvements (validated `next`, Google `pending` state). Copy updated; the "signed up by email before?" footnote removed. Google remains the primary path (no `autoFocus` on the email input).
- **Manual step**: the Email provider must be enabled in Supabase Auth → Sign In / Providers (v0.3.2 listed disabling it as a manual step). Reminder: built-in Supabase SMTP is heavily rate-limited — custom SMTP is still on the pre-marketing blocker list.

## v0.3.14 — 2026-07-24

Investigation of @lgspotzplanez's unverified 15:53 S-76 catch: capture-time verification re-checks heading/pitch against a re-queried live position, and at close range (both misses were low helicopters ~130–360 m away) seconds of feed staleness swing the true bearing past the 60° tolerance. 385 photo sightings in 14 days, only these 2 misses — both this pattern.

### Fixed — close-range verification
- **`app/api/sightings/route.ts`**: new `VERIFY_CLOSE_RANGE_M = 2000` — when the live aircraft is within 2 km of the observer, the heading/pitch pointing checks are skipped (`verified = nearEnough && (close || (headingOk && pitchOk))`). Nearly-overhead geometry is dominated by feed-position staleness, and fabrication is moot when the plane demonstrably is right there. The 80 km distance cap still applies.
- **Diagnosability**: unverified photo captures now record *why* in a new nullable `sightings.verify_fail_reason` column (`not_airborne`, `no_position`, `distance Nkm`, `heading X vs Y`, `pitch X vs Y`); null when verified. DB migration `sightings_verify_fail_reason`.
- **Data fix**: the two wrongly-unverified helicopter sightings (R44 G-DDAD 2026-07-19, S76 G-FXVA 2026-07-24) retro-verified by one-off SQL — they now appear in the feed / profile / books.

## v0.3.13 — 2026-07-23

Two feedback items (in-app `feedback` table): the 3-button feed votes (2026-07-20) and the spot-map new-airline/type colouring fix (2026-07-23).

### Changed — feed reactions → 3-button votes
- **`lib/reactions.ts`**: 5-emoji `REACTIONS` → 3-vote `VOTES` (🛫 "Great catch" / 🛬 "Not feeling this one" / ❓ "Can't see the plane"); `ReactionState` shape unchanged so the feed page aggregation and `SightingBrowser` wiring needed no changes.
- **`components/Reactions.tsx` rewritten**: mutually exclusive vote (one per user per sighting), tap again to clear, switch via atomic upsert on `(sighting_id, user_id)`; optimistic UI with full-state rollback. On a successful ❓ vote it fire-and-forgets `review_vote(sighting, false)` — the existing RPC enforces the 5-verified standing, 100/day cap, self-exclusion and net-2 flag rule, so feed ❓ votes and `/review` votes share the same `photo_reviews` tally (ineligible taps stay cosmetic). Leaving ❓ calls the new `review_unvote` (no-op once flagged — the flag stands for admin verdict). Selected styles: 🛫 `rarity-uncommon` green, 🛬 `stamp` red, ❓ `brass` amber. `/review` page and RPCs kept unchanged — both paths coexist.
- **DB migration `reactions_three_vote_rework`**: dedupe to one row per `(sighting_id, user_id)` (keep earliest), collapse historical emojis to 🛫 (all five were positive-ish; keeps Popular counts), CHECK swapped to the 3-vote set, unique `(sighting_id, user_id, emoji)` → `(sighting_id, user_id)`, and a new own-rows UPDATE policy (the vote-switch upsert needs it).
- **DB migration `review_unvote_rpc`**: SECURITY DEFINER `review_unvote(p_sighting)` — deletes the caller's `photo_reviews` row only while the sighting's `review_status` is still null.
- **DB migration `feed_views_takeoff_reaction_count`**: `feed_sightings` + `all_sightings` lateral `reaction_count` now counts only 🛫, so the feed's Popular sort ranks by positive votes (🛬/❓ don't boost popularity). `shared_sightings` untouched.

### Fixed — spot-map newness colouring
- **`app/spot/page.tsx`**: the map's "new airline" check compared callsign-derived brands against stored FR24 operator names — two naming schemes that rarely match, so already-caught airlines showed as new forever. The collection query now also selects `callsign` and indexes BOTH the stored `airline` and `airlineFromCallsign(callsign)`, making the check symmetric with the candidate side (raw-code fallbacks match raw-code fallbacks). Type comparison uppercased on both sides (candidate feed casing isn't guaranteed). No visual changes.
- Known limit noted, not fixed: the collection select has no `.limit()` (Supabase 1000-row default) — fine at ~440 sightings, pagination is a future point.

## v0.3.12 — 2026-07-17

Follow-up to the v0.3.11 profile-banner report: the "overlap" turned out to be a design complaint (empty teal slab, plane glyph cropped at the edge), not layout.

### Changed
- **`app/u/[handle]/page.tsx` cover band redesigned** as a flight chart: faint radial-gradient dot grid, home-airport code watermark top-left (`text-paper/15`, only when set), dashed route line (`preserveAspectRatio="none"` SVG so it spans all widths) climbing to the plane glyph — now smaller, rotated along the route, and fully inside the band (was `130px` at `right-7 top-5`, clipped). Bottom-left kept clear for the overlapping avatar.

## v0.3.11 — 2026-07-17

Feedback batch (2026-07-17 chat): scrapbook airport atlas + KPI recentring, type dropdowns + cleaner search, photo retake, PWA top safe-area fix, share-your-book, WhatsApp unfurl fix, and an app-wide photo/handle consistency pass (now a standing convention in AGENTS.md).

### Added
- **`lib/airports.ts` reshaped**: `AIRPORTS` values are now `{name, country, continent}` (`airportInfo()` added; `airportName`/`AIRPORTS_LIST` signatures unchanged). Taste calls documented in the file: Turkey → Europe, Egypt → Africa, Mexico/Panama → North America.
- **`components/AirportAtlas.tsx`**: continent → country → airport accordion (nested native `<details>`, LiveryChecklist pattern) with totals at each level; unknown codes fall into an "Other" bucket. Replaces the flat Departures/Destinations chip walls on `/scrapbook` (merged tally, per-chip ↑dep/↓dest via `AirportCode`'s new `detail` prop).
- **Retake** (`components/DiscoveryMoment.tsx` + `app/spot/page.tsx`): confirm-guarded "Retake — delete this catch" button reuses `deleteSighting` (photo + row) and returns to the live camera. Known side effects: type/airline universe upserts persist; retake consumes a rate-limit slot.
- **Share your book**: book building extracted to `lib/bookBuilder.ts`, page chrome to `components/BookView.tsx`; new public read-only route **`app/u/[handle]/books`** sourced from `feed_sightings` (verified-only, GPS-free) with `generateMetadata` + `opengraph-image.tsx` (progress + cover strip). `BookSlot` gains `readOnly`; `ShareButton` gains `path`/`title`/`label` props; "Share book" button on `/books`.
- **DB migration `book_covers_public_read`**: SELECT policy opened to everyone (cover *choices* only — photos were already public); writes stay owner-only.
- **DB migration `shared_sightings_view`**: like `feed_sightings` but without the `verified` filter (flagged photos still hidden, no GPS columns) — `/s/[id]` + its OG image now read it, so unverified catches shared from the capture screen unfurl properly (this was the WhatsApp bare-link bug). Verified copy on page/OG is now conditional.

### Changed
- **Consistency pass (photo → same card, handle → profile link; convention added to AGENTS.md)**: card info block extracted as `SightingSpecs` (shared, `dark` variant); `Lightbox` now renders it (full FLIGHT/ALT/PHASE/ROUTE/ETA/RARITY/LIVERY/SEEN + linked spotter + photo swap); new `components/SightingPhoto.tsx` (+ `SightingCardZoom`) lets server components open it. Adopted in: `BookSlot` (photo tap = card; cover picker moved to a "⋯ N photos" corner button), profile `RareCatch`, `WeeklyReview` catch-of-the-week (select widened to full card columns), `DiscoveryMoment` photo, `/s/[id]` (zoomable + type display name), admin `/reports` thumbs (raw-file link kept for moderation). Handle links fixed in `/reports`, `LeaderboardBoard` + `Comments` (avatar now inside the link). `ReviewQueue` documented as the deliberate anonymous exception.
- **`components/SightingBrowser.tsx`**: type pill wall → native `<select>` with per-type counts, compact search + result-count line (covers scrapbook Cards and `/feed` in one change).
- **`/scrapbook` hero**: KPI wheels `justify-evenly` at all breakpoints (was left-clumped on sm+).
- **`components/TopNav.tsx`**: `pt-[env(safe-area-inset-top)]` — first top safe-area handling (bottom-only before), fixes the status bar overlapping the header/profile banner in installed-PWA mode.
- **`/u/[handle]` metadata**: description + OG/twitter card added (was title-only).

## v0.3.10 — 2026-07-17

Books page: pick your cover photo + a real Rarity book (feedback 2026-07-17 chat — cover was hardcoded to the latest shot, and the Rarity tab rendered identically to the Type tab).

### Added
- **DB migration `book_covers`**: `(user_id, kind 'type'|'airline', key, sighting_id, updated_at)` PK `(user_id, kind, key)`, sighting FK `ON DELETE CASCADE` (deleting the chosen sighting reverts the slot to latest-photo), RLS own-rows only (4 policies).
- **`app/books/actions.ts` `setBookCover`**: validates ownership + photo presence + that the sighting actually matches the slot (`aircraft_type`/`airline` = key) before upserting; revalidates `/books`.
- **`components/BookSlot.tsx`** (slot moved out of the page, now client): collected slots with >1 photo show an "N photos" badge and open a CoverPicker modal (grid of own shots, current highlighted, save → refresh; shared `useDialog`). Rarity-book slots save under kind `"type"` so Type/Rarity books always agree.

### Changed
- **`app/books/page.tsx`**: sightings query gains `id`; builds newest-first per-key photo options + reads `book_covers` (chosen cover if still valid, else latest). **Type book now alphabetical; Rarity book groups the same universe into tier sections** (Common → Legendary, tier stamp + heading + per-tier x/y count) — the two books are finally distinct. Airline book unchanged. All/Missing filter works within sections; empty sections hidden.

## v0.3.9 — 2026-07-17

Three feedback items — popular feed toggle (2026-06-16), weekly review pop-up + customisable avatars (2026-07-17) — plus the curated rarity pins that had accumulated under Unreleased.

### Added — popular feed toggle
- **`/feed?sort=popular`**: sightings captured in the last 30 days ordered by reaction count (tie-break recency), so old winners age out of the window. The static "Latest" chip row is now two `<Link>` pills (Latest/Popular); subtitle changes accordingly (`app/feed/page.tsx`, searchParams-Promise pattern from `app/books/page.tsx`). Completes the sort-toggle half of the 2026-06-16 feedback — capture-of-the-day remains backlog.
- **DB migration `add_reaction_count_to_feed_views`**: `reaction_count` appended as the LAST column of `feed_sightings` + `all_sightings` via a lateral count over `reactions` (public-read under RLS, existing `reactions_sighting_idx`, all consumers select explicit columns so nothing else changes).

### Added — weekly review pop-up
- **New `components/WeeklyReview.tsx`**, mounted in `app/layout.tsx` for signed-in users: from Monday, the first visit of the week (on `/`, `/scrapbook`, `/feed` — never `/spot`) opens a card reviewing the previous Mon–Sun: spots, new types, distinct airlines, overall rank (`profile_stats`), and the rarest catch (photo + rarity stamp, links to `/s/{id}`). All week numbers computed client-side from the user's own sightings rows under RLS — zero DB changes (`profile_stats`' week window is current-week and reads ~0 on Monday).
- Gating: `localStorage["skydex_weekly_seen"] = <local date of this week's Monday>` (local-time Monday math, no `toISOString()` date shift); onboarding (`GuideModal`) always wins first; empty weeks stamp silently instead of nagging; query errors retry next visit. Dev hook: `window.dispatchEvent(new Event("skydex:open-weekly-review"))` ignores the stamp.

### Added — customisable avatars
- **Structured avatar seeds, zero schema change** (`lib/avatar.ts`): `c:<motif>:<bg>:<fg>:<treatment>` — 12 icons × free background/icon colour picks from the 8 brand colours (only guard: bg ≠ fg) × 3 ring styles = 2,016 combos. Anything else hashes exactly as before — **verified byte-identical on 506 legacy seeds** (old vs new module compiled side by side), so nobody's avatar changes until they re-save. Legacy palettes map to nearest-equivalent picker prefills only.
- **`components/AvatarEditor.tsx` rebuilt**: live preview + icon grid (12 mini-avatars in the currently picked colours), background/icon colour swatch rows (the swatch matching the other pick is disabled), style segmented control, Shuffle kept. Changed-detection compares decoded parts, not strings, so re-saving an identical look doesn't burn the daily save.
- **`updateAvatar` hardened** (`app/profile/actions.ts`): only valid structured seeds accepted (regex + range + bg ≠ fg) — closes the previous any-64-char-string hole. Once-a-day limit kept.

### Changed — rarity overrides + widebody floor (DB-side, live immediately; folded from Unreleased)
- **DB migration `rarity_overrides_and_widebody_floor`:** new `rarity_overrides(code, tier, note)` table (RLS deny-all, same pattern as `measured_rarity`) seeded with three pins — **A380 → rare**, **747-400 → rare**, **Spitfire → legendary** — that win over measurement everywhere: the live universe, first captures (`register_aircraft_type()` v3 checks overrides before measured), and future re-measurement runs (`scripts/rarity-apply.mjs` now applies overrides last in its generated SQL). Plus **widebody joins the category floors** (`rarity_floor('widebody') = 'uncommon'`): a widebody catch is never common — lifts 777-300ER / 787-9 / A350-900 from their measured common. Sightings backfilled: 219/57/30/1 → 160 common / 106 uncommon / 40 rare / 1 legendary (59 widebody catches ↑ uncommon, 10 A380/744 catches ↑ rare).
- **DB migration `predict_rarity_respects_overrides`:** the v0.3.8 map-popup RPC now checks `rarity_overrides` first (`coalesce(override, universe, measured, 'rare')`) so pins show correctly even for types nobody has captured yet.
- **`app/spot/page.tsx` `mapRarity()`** client floor mirror gains widebody ≥ uncommon (needs a deploy to reach users, but the RPC already returns floored tiers for every registered type, so the map is correct for all current cases without it).
- Measured narrowbody demotions deliberately kept (737-700 → rare etc.) — honest European scarcity is the point of the overhaul.

## v0.3.8 — 2026-07-17

Map rarity on tap + rare/epic/legendary glow (completes the 2026-07-17 map feedback item; its first half — the key move — shipped in v0.3.6).

### Added
- **Predicted rarity in the map popup** (`components/SpotMap.tsx` + `app/spot/page.tsx`): tapping a plane now shows a tier chip (colour = the `--color-rarity-*` token) predicting what the type would land on if captured. Prediction mirrors `register_aircraft_type()`: canonical `aircraft_types` tier when the type has been captured before, else the measured Europe-snapshot tier, else rare by construction — with the DB's category floors (helicopter ≥ uncommon, military ≥ rare, vintage ≥ epic) applied client-side from the curated category map, falling back to live ADS-B hints (military flag / `A7` rotorcraft) exactly like `/api/sightings`.
- **Rare+ markers glow**: rare / epic / legendary aircraft get a two-layer CSS `drop-shadow` halo in their tier colour, independent of the newness fill (gold/green/ink) and the special-livery ring. New "glow = rare+" row in the map key.
- **DB migration `predict_rarity_rpc`**: read-only SECURITY DEFINER `predict_rarity(p_codes text[]) → (code, tier)` (STABLE, `search_path=public`, input capped at 200 codes, `^[A-Z0-9]{2,4}$` filter) so `measured_rarity` stays RLS deny-all. Granted to `anon` + `authenticated`; verified over the REST path with the publishable key.
- Client fetches tiers once per type code as the map polls (`typeRarity` cache + requested-set; failed batches retry on the next poll). No FR24 credits involved anywhere.

### Feedback housekeeping
- Marked resolved (already shipped): map key top-right + clearer key colours (v0.3.6), per-size/heli plane symbols (v0.3.3), observer facing direction + new-catch marker colouring (v0.3.3/v0.3.4), and — with this release — the 2026-07-17 map key/rarity/glow item.

## v0.3.7 — 2026-07-17

Community-review removals are now hard deletes + admin queue photo zoom (feedback 2026-07-17).

### Changed
- **Upholding a photo flag now hard-deletes the sighting** (migration `photo_flag_upheld_hard_delete`). Previously `resolve_photo_flag(approve=true)` soft-hid it (`review_status = 'removed'`, `verified = false`) — the sighting dropped off leaderboards/profile stats but **still counted towards the owner's scrapbook completion wheels and Type/Airline/Rarity books** (those count any sighting with a photo, no `verified` filter). Now the row is deleted (comments/reactions/photo_reviews cascade) and the stored photo file is removed too (`resolvePhotoFlag` server action grabs `photo_path` before the RPC and calls `storage.remove` after, mirroring `deleteSighting`).
- **`photo_warnings.sighting_id` FK changed CASCADE → SET NULL** (column now nullable): the owner's warning row must survive the delete — it powers the "deleted after community review" notice on their Scrapbook. The RPC marks the warning `upheld` *before* deleting the sighting.
- Scrapbook warning copy updated for the upheld case ("N of your sightings were deleted after community review confirmed no aircraft was visible"); admin button relabelled "Approve — delete sighting" (`app/reports/page.tsx`).
- Reject path unchanged: `cleared` + permanently immune from re-flagging, warning withdrawn.
- No back-fill needed: zero rows had `review_status = 'removed'` at migration time (9 flagged awaiting verdict, untouched).

### Added
- **Flagged photos in the `/reports` admin queue open full-size in a new tab** (click the thumbnail; hover shows an "Open full size" cue) — you can now actually inspect a photo before ruling on it.

### Dev
- `.claude/launch.json`: `autoPort: true` on `skydex-dev` so a second session can start a preview without colliding on port 3000.

## v0.3.6 — 2026-07-17

Profile page overhaul + rarity overhaul part 2 + community-review thresholds tightened (feedback 2026-07-17) + map key relocation/legibility (feedback 2026-07-12).

### Added
- **Full history now loads on profiles.** The page previously hard-capped at the 60 most recent sightings with no way to see older ones. It now loads 24 up front and a **Load more (N remaining)** button pages through everything via a new `loadMoreSightings` server action (`app/profile/actions.ts`), with a "showing X of Y" counter in the section header (Y from an exact count on `feed_sightings`). Shared query/mapper logic extracted to `lib/profileSightings.ts` (used by both the page and the action).

### Changed
- **Pinning favourites is now instant and obvious** (`components/ProfileSightings.tsx` rewrite). The tiny ☆ overlay (which overlapped the VERIFIED stamp, popped `alert()`s, and forced a full `router.refresh()` per tap) is replaced by a full-width **"☆ Pin to profile" / "★ Pinned — tap to unpin"** button under every card. Pins update optimistically — the Favourites tray at the top reflects the change immediately, no page reload — and revert with an inline toast if the server rejects. The tray shows a **n/3 pinned** counter, lets owners unpin directly from it (previously read-only, so you had to hunt for the starred card in history), and shows a hint box when empty. The component now owns Favourites + history in one client island (medals/stats render between as children) so both stay in sync.

### Changed — rarity overhaul part 2: measured tiers are LIVE (DB-side, no deploy needed; closes the 2026-07-11 rarity feedback, now marked resolved)
- **Snapshot stopped at 15/48 rounds by choice** (7h from Sat 12 Jul + ~1h from Thu 17 Jul; 9,333 distinct airframes, 447 usable types). Thresholds recalibrated for the truncated window: `--common=120 --uncommon=30 --rare=5 --epic=2` → 15 common / 36 uncommon / 145 rare / 112 epic / 139 legendary across observed types. Sanity-checked: commons are the A320/737 families + C172/PA-28 trainers + 787-9/777-300ER/A350; the legendary tail is genuinely one-off (DC-3, Ka-27, C-27J, Gulfstream II, H60…).
- **DB migration `measured_rarity_lookup`:** new `measured_rarity(code, tier)` reference table (RLS deny-all — internal data read only by the RPC) + `register_aircraft_type()` v2: a type's FIRST capture now lands on its measured tier instead of the flat `'rare'` default; unmeasured types still default rare; category floors still only lift. Chosen over pre-inserting ~370 placeholder rows so the Type Book isn't flooded with raw ICAO codes.
- **DB migration `rarity_retier_from_snapshot`:** re-tiered the 93 existing universe rows from measurement (floors applied; demotions allowed — measurement wins), seeded `measured_rarity` (447 rows, `ZZZZ` excluded), promoted universe types absent from the snapshot to ≥ rare, and backfilled per-sighting rarity. Sightings moved from 172 common / 105 uncommon / 24 rare to 219 / 56 / 29 / **1 legendary**. Verified end-to-end: registering P28A → common (was rare-by-default), KA27 → legendary, unmeasured XX99 → rare.
- **`scripts/rarity-apply.mjs`** now emits the `measured_rarity` seed alongside the re-tier SQL and filters the `ZZZZ` unknown-type code.

### Changed — community review + map key
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
