# SkyDex — MVP spec (Phase 0)

Derived from [`research/skycards-community.md`](research/skycards-community.md). Every line below traces to a research finding (cited as **[Rn]** = section n of the research note). The Phase 0 deliverable is a deployed, multi-user web app; this spec defines what is in and explicitly out.

**Product identity:** *the spotter's real, verified logbook of the sky* — not a card-battler. **[R6: "lean into authentic verified logbook identity"]**

**One-liner:** photograph a plane you can actually see, we verify you genuinely saw it, and it becomes a card in your scrapbook.

---

## The core loop (must-have)

1. **Open** — see live aircraft in range around you (radius + altitude band). **[R5: rarity-on-live-overhead-traffic loop works]**
2. **Aim** — point the camera; a live indicator shows which in-range aircraft you're likely pointing at. **[R2: real-camera is the wedge]**
3. **Capture** — take the photo in-app; record GPS, timestamp, compass heading, device pitch. **[R2]**
4. **Confirm** — server matches the pointing geometry (bearing + elevation) against the live flight snapshot; a match → verified sighting, identity from flight data. **[R2]**
5. **Collect** — verified sighting becomes a card stamped with real flight details; awards points by rarity. **[R5: collection/dex completion is the retention spine]**

### The friction-solving hybrid (must-have, not optional)
- **Casual log** from the live map = low value, instant, preserves the tap-to-collect dopamine. **[R5: low-friction catch dopamine]**
- **Verified photo capture** = high value + prestige, fills the authentic book. **[R6: authenticity is friction; pair with easy collection]**

---

## Collection & scrapbook (must-have)
- Personal **scrapbook** of verified cards: own photo + registration, type, airline, altitude, date, location, rarity. **[R1]**
- **Checklists ticked off** against reference lists — **airports**, **carriers (airlines)**, **aircraft types** — with completion %. (User's explicit Phase-0 ask.) **[R5: dex completion]**
- **Rarity grading** (Common → Legendary) on type scarcity / livery / route-unusualness. **[R5: rarity loop]**

## Social (must-have, minimal)
- **Global feed** of recent verified sightings (photo + plane details + spotter handle), location **coarsened**. **[R1: engaged community; privacy]**
- **Public profile**: handle, home airport, headline stats.

## Accounts (must-have)
- Sign-up / sign-in (email magic-link to start). Each user owns their own sightings (RLS).

---

## Hard product rules (non-negotiable, learned from SkyCards' mistakes)
- **Never reset or devalue an earned collection.** No seasons that lock old cards. **[R3 #2: the Season-1 reset revolt]**
- **Progression is earned by spotting, never bought.** **[R4]**
- **Never raise the cost of something players already had.** **[R3 #1: cost inflation]**
- **Keep it simple** — resist feature overload; the relaxed collecting core is the product. **[R3 #3: feature overload]**
- **No ads.** Monetisation (later) = one-off Pro unlock gating exports/high-res/history, not progress. **[R4; R3 caveat: ads unconfirmed, cost-creep is the real grievance]**
- **Design for low-density areas too** (high-altitude overflights count; events; book goals). **[R3 #4: geographic unfairness]**

---

## Explicitly NOT in MVP (deferred)
- **Card battles & avatar progression** — likely never; they drove imbalance complaints and dilute the logbook identity. **[R3 #5; R6]**
- **Monetisation / paid tier** — Pro unlock, cosmetics, physical prints come post-validation (proposal Phase 2+).
- **Route (origin/destination) enrichment** — not in OpenSky state vectors; MVP cards lean on type + airline, route marked unknown. (Proposal's known data gap.)
- **Native iOS app** — web first; Expo/React Native migration is Phase 1.
- **Anti-replay / liveness hardening, photo moderation, geofencing of sensitive/military zones** — stubbed in MVP, hardened in Phase 1. **[risk register]**
- **Sign in with Apple / Google** — magic-link only for MVP (zero external setup).
- **Friends, leaderboards, private leagues, events** — proposal Phase 2.

---

## Acceptance test for Phase 0
On a real phone under a live flight path: sign up → point at a plane you can actually see → capture → receive a correctly-matched verified card → it appears in your scrapbook (ticking off its type/airline/airport) and in the global feed with coarsened location.
