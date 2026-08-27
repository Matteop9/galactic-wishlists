# App Review information

Apple's response to the v1.0 submission asks for a standing set of information in the
**Notes field of the App Review Information section** in App Store Connect, for every
future submission. This file is the source of truth for that: a paste-ready Notes
block, the screen-recording shot list, and the one-time setup steps.

⚠️ This repo is public. Real credentials never go in this file or anywhere in git —
they live only in the App Review sign-in fields in App Store Connect.

---

## 1. Paste-ready Notes block

Everything between the rules goes verbatim into ASC → App → App Review Information →
Notes (limit 4,000 characters; this block is ~3,300). Fill the two `[iOS version]`
placeholders and keep the demo credentials in the dedicated sign-in fields, not here.

---

ABOUT SKYDEX
SkyDex is a verified plane-spotting logbook for aviation enthusiasts. The spotter photographs an aircraft they can actually see; the server checks the capture's GPS position, compass heading and device pitch against live ADS-B flight data to confirm the aircraft was genuinely overhead, and the catch becomes a collectible card (registration, type, carrier, route, rarity grade). Spotters fill collection books, share catches on a global feed with comments and reactions, and compete on leaderboards. The problem it solves: plane spotting had no authentic, verified way to log and collect sightings — SkyDex makes every catch provable, which is the entire value of the collection.

TARGET AUDIENCE: plane spotters and aviation enthusiasts.

SIGN-IN / DEMO ACCOUNT
SkyDex normally offers only Sign in with Apple and Sign in with Google (no passwords). As a one-off for App Review we have provisioned a dedicated review account: tap "App Review sign-in" at the bottom of the sign-in screen and use the credentials provided in the App Review sign-in fields. The review account is pre-loaded with verified sightings so the logbook, books, feed, comments and leaderboards can be explored indoors.

USING THE MAIN FEATURES
1. Sign in (above). 2. Spot: grant location, camera and motion when prompted; the radar shows live aircraft around you; when the camera points at a real flight the reticle locks and you capture. NOTE: a genuine capture requires a real aircraft in view — verification against live flight data is the core feature — so the attached screen recording demonstrates the full capture flow outdoors. 3. Scrapbook and Books: the collection. 4. Feed: community catches with comments and reactions. 5. Settings: blocked-users list, data export, account deletion, sign out. No sample files are required.

UGC SAFETY: server-side profanity filtering, per-item reporting on photos and comments, user blocking (from any profile or comment; managed in Settings), a community photo-review queue, and admin moderation tooling.

DEVICES TESTED
iPhone 17 Pro Max (iOS 26), iPhone 16 Pro Max (iOS 26), iPhone 15 Pro Max (iOS 26), iPhone 14 Plus (iOS [iOS version]), iPhone 13 Mini (iOS [iOS version]).

EXTERNAL SERVICES
Supabase (authentication, database, photo storage; EU/London region); live ADS-B aircraft positions from adsb.lol, adsb.fi and airplanes.live (transient, never stored); Flightradar24 API (flight route/operator metadata); Planespotters.net API (aircraft reference photos); CARTO/MapLibre (map tiles); Vercel (hosting, anonymous analytics); Sentry (error monitoring). No payment processors (nothing is sold in this version), no AI services, no ad networks, no cross-app tracking (no ATT prompt).

REGIONAL DIFFERENCES
The app functions identically in all regions. Aircraft coverage varies naturally with community ADS-B receiver density. The UI is English-only.

REGULATED INDUSTRY / THIRD-PARTY MATERIAL
SkyDex does not operate in a regulated industry. It consumes publicly broadcast ADS-B flight data under licence: adsb.lol (Open Database License), adsb.fi and airplanes.live (per their API terms), Flightradar24 (commercial API subscription), and Planespotters.net photos shown with attribution per their API terms. Full attributions: https://sky-dex.com/attributions.

---

## 2. Screen-recording shot list

Apple wants a recording captured on a **physical device running the latest iOS**,
starting from app launch, showing the typical flow plus the sensitive flows. Use the
built-in iOS screen recording (Control Centre), attach the file in App Review
Information → Attachments (or a link in Notes if too large).

Record outdoors with aircraft overhead — near an approach path is easiest (within
~2 km of the aircraft the verification cone is relaxed, so close to an airport is the
most reliable place to demo a capture).

Shot list, in order:

1. **Launch** the app from the home screen (recording must start here).
2. **Onboarding guide** — open the "How it works" 5-step guide.
3. **Sign-in** — show the sign-in screen with both buttons, sign in with the review
   account via Apple or Google (registration and login flow).
4. **Permission prompts** — first visit to Spot triggers location, camera and motion
   prompts; accept them on camera. (There is no ATT prompt — nothing to show.)
5. **Core loop** — radar with live aircraft → aim until the reticle locks → capture →
   the verified card → the catch in Scrapbook and Books.
6. **Feed / UGC** — scroll the feed, open comments, post a comment, react.
7. **Reporting** — Report on a sighting photo and on a comment.
8. **Blocking** — Block a user from a comment (or their profile), show their content
   disappearing, then Settings → Blocked spotters → Unblock.
9. **Account deletion** — Settings → Danger zone → Delete account, show the
   confirmation dialog, then **cancel** (don't delete the seeded review account).

Not applicable (nothing to record): paid content, purchases, subscriptions — nothing
is for sale in this version (`PACKS_AVAILABLE` / `ENFORCE_PAYWALL` / `ADS_ENABLED`
are all hard-off in `lib/tickets.ts`).

## 3. One-time setup (manual, outside this repo)

1. **Supabase → Authentication → Providers**: re-enable the **Email** provider (it was
   disabled at the v0.5.0 OAuth cutover). Keep "Confirm email" on. The app UI has no
   email signup — the login page only calls `signInWithPassword` — so this only
   enables the review account below.
2. **Supabase → Authentication → Users → Add user**: create the review account with a
   strong password, auto-confirmed. Suggested email: an alias you control.
3. Sign in as the review account once (web or TestFlight, via "App Review sign-in"):
   pick a handle (e.g. `appreview`) and **capture a handful of real sightings** so the
   account demonstrates a populated logbook indoors.
4. Put the credentials into ASC → App Review Information → **Sign-in required** fields.
5. Fill the two `[iOS version]` placeholders in the Notes block (TestFlight → devices,
   or Settings → General → About on each phone).
6. Record the video per the shot list; attach it.
7. Paste the Notes block; submit.

After approval the Email provider can stay enabled (the UI offers no email signup) or
be disabled again between submissions — if disabled, re-enable before the next review
so the account still works.
