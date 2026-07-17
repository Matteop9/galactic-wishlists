// User-facing release log, newest first. Versioning is semantic MAJOR.MINOR.PATCH:
//  - PATCH (0.1.x): a feature or fix within the current phase.
//  - MINOR (0.x.0): a phase milestone / big capability shift (e.g. 0.3.0 = native iOS app).
//  - MAJOR (x.0.0): public launch / acquisition-ready.
// On every release: bump CURRENT_VERSION, prepend a RELEASES entry, mirror in CHANGELOG.md.

export type Release = {
  version: string;
  date: string; // YYYY-MM-DD
  changes: string[];
};

export const RELEASES: Release[] = [
  {
    version: "0.3.7",
    date: "2026-07-17",
    changes: [
      "Community review verdicts now have real teeth: when an admin upholds a flag (the community agreed no aircraft was visible), the sighting is deleted outright — it no longer lingers in your books or completion wheels, and the photo itself is removed. You'll still see a notice on your Scrapbook explaining what happened.",
      "Admins can now open a flagged photo full-size from the Reports queue before ruling on it.",
    ],
  },
  {
    version: "0.3.6",
    date: "2026-07-17",
    changes: [
      "Your whole logbook now loads on your profile — history used to stop silently at the 60 most recent catches; now a Load more button pages through everything, with a running 'showing X of Y' count.",
      "Pinning favourites is finally easy: a clear Pin to profile button under every card (no more hunting for the tiny star), pins appear in your Favourites tray instantly, and you can unpin straight from the tray. The tray shows how many of your 3 slots are used.",
      "Rarity is now measured from real skies — as promised in 0.3.3, every aircraft type has been re-graded from a live snapshot of European air traffic (9,000+ airframes observed). Your collection and past sightings have been re-tiered: A320s are properly common, and that DC-3 is officially legendary.",
      "Community review verdicts land faster: two net no-votes now send a photo to the admins (was three), and two net yes-votes approve it — approved photos leave the review queue for good, so your reviews always count on photos that still need eyes.",
      "The map key moved to the top-right and now shows the real marker shapes — filled plane silhouettes in gold/green/black plus the dashed special-livery ring — so the colours actually read against the map.",
    ],
  },
  {
    version: "0.3.5",
    date: "2026-07-12",
    changes: [
      "The Spot button moved to the middle of the bar and got big — it's THE button. Tap the teal circle, catch a plane.",
      "Community review is here (Settings → Community review): help keep the feed honest by checking random spotters' photos really show an aircraft. Unlocks once you have 5 verified sightings.",
      "Photos that three independent reviewers can't see a plane in are hidden from the feed and go to an admin for a final decision — honest yes-votes cancel out no-votes, reviews are anonymous and randomly assigned, and nobody can pick whose photos they review.",
    ],
  },
  {
    version: "0.3.4",
    date: "2026-07-12",
    changes: [
      "Map colours got smarter — gold now means everything about that plane is new for you (type, airline, livery), green means something is, black means you've caught it all before. Tap a plane to see exactly what's new.",
      "Special liveries stand out on the map — airframes wearing one get a dashed gold ring, and the tap card names the livery.",
    ],
  },
  {
    version: "0.3.3",
    date: "2026-07-12",
    changes: [
      "The map now shows your field of view — a gold cone sweeps with your phone's compass so you can see exactly which way you're facing, sized to the same window the camera accepts a capture in.",
      "Planes on the map now look like what they are — helicopters get a rotor icon, light aircraft and bizjets a small silhouette, widebodies a big one.",
      "Gold planes on the map = a type you haven't caught yet. Go get them.",
      "Helicopters have joined the rarity system properly — they're never graded Common again, and military aircraft now carry their own category with a Rare floor.",
      "Brand-new aircraft types discovered in the wild now enter the universe as Rare (not Common) — if it's not already in the SkyDex catalogue, it's not an everyday plane.",
      "Behind the scenes: we're measuring 24 hours of real European air traffic to re-grade every type's rarity from actual data — proper distinction between common and rare is coming to your whole collection.",
    ],
  },
  {
    version: "0.3.2",
    date: "2026-07-06",
    changes: [
      "Sign-in is now one tap with Google — no more waiting for magic-link emails. If you joined by email, just use Google with the same address and your logbook carries straight over.",
      "We've added privacy-friendly analytics so we can see which parts of SkyDex people love (no cookies, no tracking you around the web).",
    ],
  },
  {
    version: "0.3.1",
    date: "2026-07-06",
    changes: [
      "Verification got real teeth — every capture is now re-checked server-side against live flight data (position, direction, elevation) before it earns the VERIFIED stamp. Nobody can fake their way onto the boards.",
      "Duplicate protection — accidentally double-tapping capture no longer logs the same plane twice.",
      "Spotting from altitude now works properly — your GPS elevation feeds the detection cone, so mountain and hilltop spotters see accurate angles.",
      "Times on cards now read in UTC (Zulu) — the aviation way, and consistent wherever you are.",
      "Sharper around the edges — keyboard and screen-reader support for photo viewers and dialogs, honest error messages when something fails to post, and the tab bar now clears the iPhone home indicator.",
      "Under the hood: faster page loads (lighter session checks, cached airline lookups, cached reference photos) and a stack of security hardening.",
    ],
  },
  {
    version: "0.3.0",
    date: "2026-06-26",
    changes: [
      "A fresh look — “The Logbook”. New luggage-tag logo, bolder rarity stamps, and a warmer, more field-journal feel across the whole app.",
      "New bottom tab bar — Spot, Scrapbook, Feed, Boards and Profile are always one tap away, on phone and desktop alike.",
      "Redesigned profile — a teal cover band, your home-base tag, a clean stats strip and your rarest catches up top.",
      "Books got tidier — luggage-tag tabs, cleaner slots, and an All / Missing filter.",
      "Subtle motion — the hero tag sways, progress wheels sweep up as you collect, and the verified stamp lands with a satisfying thunk. All of it respects your reduced-motion setting.",
    ],
  },
  {
    version: "0.2.7",
    date: "2026-06-25",
    changes: [
      "Tidier aircraft type names — every type now uses one clean, consistent name (so it's “AgustaWestland AW109”, not “AGUSTA AW-109 Grand”). Your existing cards updated automatically.",
    ],
  },
  {
    version: "0.2.6",
    date: "2026-06-25",
    changes: [
      "Cards now carry richer, more accurate flight info — your sighting is verified against Flightradar24 at the moment of capture, so the route, operator and registration are spot-on.",
      "New on every card: the plane's phase of flight when you caught it (climbing, cruising or descending) and its speed, plus the arrival time.",
      "Spotted a wet-lease? Aircraft flying for one airline but painted in another's colours now get a Wet-lease badge.",
    ],
  },
  {
    version: "0.2.5",
    date: "2026-06-25",
    changes: [
      "Routes are back! Departure → destination shows on your cards again — but now we check the plane's actual heading against the airport positions, so a flight caught on its way home is no longer shown flying the wrong way. If we can't confirm the direction, we leave it off rather than guess.",
      "Departures and Destinations are back in your Scrapbook, plus the Airports leaderboard and profile stat.",
    ],
  },
  {
    version: "0.2.4",
    date: "2026-06-19",
    changes: [
      "Special liveries! Over 2,000 specially-painted aircraft — anniversaries, sponsors, retro schemes, one-offs — are now collectibles. Catch one and its card gets an animated holographic frame and a ✦ Special Livery mark.",
      "New Liveries checklist (in the nav) to tick off every special livery, with search and an All · Collected · Missing filter. Your progress also shows on the Scrapbook.",
    ],
  },
  {
    version: "0.2.3",
    date: "2026-06-18",
    changes: [
      "Airports are taking a break — the route data behind them was often wrong (a flight landing in one place could show up as another), so we've hidden it until we can do it properly.",
      "Wider catch range — aircraft a little further overhead now show up in range.",
    ],
  },
  {
    version: "0.2.2",
    date: "2026-06-18",
    changes: [
      "Plane details now come from a single live source, so aircraft types read consistently (e.g. “787-8 Dreamliner” instead of a bare code).",
    ],
  },
  {
    version: "0.2.1",
    date: "2026-06-17",
    changes: [
      "The 'In range' list on the Spot screen now shows each aircraft's altitude (in feet).",
      "Tidier top bar — the menu is now compact icons on a single line, and the page you're on is highlighted.",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-06-17",
    changes: [
      "The Scrapbook, reimagined — open it and your collection progress is the first thing you see, with completion wheels for Types and Carriers.",
      "Less clutter: Types, Carriers, Departures and Destinations now tuck away into tidy sections you tap to open.",
      "Airports now count how many times you've spotted each one, e.g. LHR 152 (tap for the full name).",
      "Totals by rarity — see your collection broken down across common → legendary at a glance.",
    ],
  },
  {
    version: "0.1.27",
    date: "2026-06-17",
    changes: [
      "Airline logos now appear next to each carrier in your scrapbook.",
    ],
  },
  {
    version: "0.1.26",
    date: "2026-06-17",
    changes: [
      "Usernames and comments now run through a profanity filter to keep things friendly.",
      "Your home airport now offers a type-ahead list of airports and is validated when you save.",
    ],
  },
  {
    version: "0.1.25",
    date: "2026-06-17",
    changes: [
      "Live map! Tap Map on the Spot screen to see the aircraft around you on a real map, each pointing the way it's flying.",
      "Tap a plane on the map to track it, then switch back to Camera to line up your shot.",
      "The map is a spotting aid only — as always, a sighting is only logged when you capture a verified photo.",
    ],
  },
  {
    version: "0.1.24",
    date: "2026-06-17",
    changes: [
      "Rarity is now obvious at a glance — every card has a border in its tier colour.",
      "Tap an airport code on a card or in your scrapbook to see the airport's full name.",
      "Filter the scrapbook's Types and Carriers by All, Collected or Missing.",
    ],
  },
  {
    version: "0.1.23",
    date: "2026-06-17",
    changes: [
      "Public profiles! Tap anyone's @name to see their profile — favourite sightings, stats and how they rank. Your name (top-right) now opens a menu: Profile and Settings.",
      "Pick up to 3 favourite sightings to feature on your profile (tap the ☆ on your cards).",
    ],
  },
  {
    version: "0.1.22",
    date: "2026-06-17",
    changes: [
      "Leaderboards! See the world's top spotters by total spots (today / this week / all-time), and all-time by aircraft types, carriers, airports and rarity score. Find them under 'Boards'.",
    ],
  },
  {
    version: "0.1.21",
    date: "2026-06-17",
    changes: [
      "Catches no longer go missing their aircraft type — when the live feed doesn't recognise the model (common for brand-new aircraft), SkyDex now cross-checks other sources so your Dreamliners and A380s get logged properly.",
    ],
  },
  {
    version: "0.1.20",
    date: "2026-06-17",
    changes: [
      "Discovery moment — every catch now opens a reward screen showing how rare it is: how many spotters have caught the type today / this week / this month / ever, what's new to your collection, and the grail line when you're the only one in the world to have it.",
    ],
  },
  {
    version: "0.1.19",
    date: "2026-06-17",
    changes: [
      "React to sightings on the feed — tap 🛫 🔥 😍 👀 🏆 to react, not just comment.",
    ],
  },
  {
    version: "0.1.18",
    date: "2026-06-17",
    changes: [
      "Added an Attributions page (in the footer) crediting the open data behind SkyDex — adsb.lol, airplanes.live, adsbdb and Planespotters.",
      "Tidied our live data sources to lean on commercial-friendly open data.",
    ],
  },
  {
    version: "0.1.17",
    date: "2026-06-16",
    changes: [
      "Admins now wear a captain's badge avatar.",
      "Full-screen view shows your photo and the reference aircraft BeReal-style — tap the corner thumbnail to swap which is big.",
    ],
  },
  {
    version: "0.1.16",
    date: "2026-06-16",
    changes: [
      "Customise your avatar — shuffle and save (once a day) from your profile.",
      "Your avatar + name now live top-right (tap for your profile); sign out moved into the profile.",
    ],
  },
  {
    version: "0.1.15",
    date: "2026-06-16",
    changes: [
      "Full-screen view now shows a reference photo of the actual aircraft (right livery), credited to Planespotters.",
      "Spotting range opened up a bit after the last tightening.",
    ],
  },
  {
    version: "0.1.14",
    date: "2026-06-16",
    changes: [
      "Everyone now has a unique plane-spotter avatar, shown on the feed and comments.",
    ],
  },
  {
    version: "0.1.13",
    date: "2026-06-16",
    changes: [
      "Tighter spotting range — distant, low aircraft no longer clutter the list; range now scales with how high a plane sits overhead.",
      "Scrapbook airports split into Departures and Destinations.",
    ],
  },
  {
    version: "0.1.12",
    date: "2026-06-16",
    changes: [
      "Track a specific plane — tap it in the in-range list to capture only that one (resets if it flies out of range).",
      "Tap any photo to view it full screen, on the feed and your scrapbook.",
    ],
  },
  {
    version: "0.1.11",
    date: "2026-06-16",
    changes: [
      "Sign in with Google — no email needed.",
      "A first-time guide (reopen any time from your profile).",
      "Delete your own sightings from the scrapbook.",
      "Comment counts shown on the feed.",
      "Dev tools tidied into the profile; privacy fixes.",
    ],
  },
  {
    version: "0.1.10",
    date: "2026-06-16",
    changes: [
      "Bigger rarity stamps on cards.",
      "Removed 'Log from map' — every sighting is now a real verified photo.",
    ],
  },
  {
    version: "0.1.9",
    date: "2026-06-16",
    changes: [
      "Share button on verified sightings — posts a clean card image to socials.",
      "Add SkyDex to your home screen (installable app).",
      "New Feedback box on your profile — tell us bugs and ideas directly.",
    ],
  },
  {
    version: "0.1.8",
    date: "2026-06-16",
    changes: [
      "Carriers are now consolidated by brand (easyJet, not easyJet Europe).",
      "The types and carriers universe now grows automatically from real captures, so everything you catch always matches.",
    ],
  },
  {
    version: "0.1.7",
    date: "2026-06-16",
    changes: [
      "Scrapbook 'book' view — polaroid albums by Type, Airline and Rarity, with empty gaps to fill.",
      "Rarity stamps on every card, replacing the side bar.",
      "Friendlier aircraft names (A380 instead of A388).",
    ],
  },
  {
    version: "0.1.6",
    date: "2026-06-16",
    changes: [
      "Rarity! Every sighting is now graded Common → Legendary by aircraft type.",
      "Scrapbook shows the full Types and Carriers universes — collected ones lit up, the rest greyed, with X/N progress.",
      "Spot the A380, 747 or A340 for Rare; Concorde or a warbird would be Legendary.",
    ],
  },
  {
    version: "0.1.5",
    date: "2026-06-16",
    changes: [
      "Sightings now record the flight's route — departure and destination airports.",
      "Scrapbook Airports checklist populates, and cards show the route.",
      "Camera: a small unzoomed overview in the corner when zoomed, to help you find the aircraft.",
      "Switched to semantic versioning (MAJOR.MINOR.PATCH).",
    ],
  },
  {
    version: "0.1.4",
    date: "2026-06-16",
    changes: [
      "Report a sighting or comment — flagged items go to admins for review.",
      "Zoom slider in the camera when spotting.",
    ],
  },
  {
    version: "0.1.3",
    date: "2026-06-16",
    changes: [
      "Privacy and Terms pages, linked in the footer.",
      "Export all your data, or permanently delete your account, from your profile.",
      "Admin moderation and unverified-view tools now live behind dev mode.",
    ],
  },
  {
    version: "0.1.2",
    date: "2026-06-16",
    changes: [
      "Moderation tools for site admins — remove any photo or comment.",
      "Admin dev mode: optionally view unverified sightings in the feed.",
    ],
  },
  {
    version: "0.1.1",
    date: "2026-06-16",
    changes: [
      "Global feed of everyone's verified sightings.",
      "Comments — anyone signed in can comment on a sighting, shown with their @username.",
      "Search and filtering (by aircraft type) on both the feed and your scrapbook.",
      "Scrapbook gains a Verified-only filter.",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-06-16",
    changes: [
      "First public build — the capture-and-verify loop is live.",
      "Sign in with a magic link; a username is now required before spotting.",
      "Spot: live aircraft targeting using your camera, compass and GPS.",
      "Verified sightings saved as cards with your photo, registration and aircraft type.",
      "Scrapbook with Types and Carriers checklists, and capture time on every card.",
      "Editable profile (username + home airport).",
    ],
  },
];

export const CURRENT_VERSION = RELEASES[0].version;
