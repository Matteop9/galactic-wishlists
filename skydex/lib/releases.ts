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
