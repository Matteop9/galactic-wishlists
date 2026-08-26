// SkyDex Tickets economy (V4 Phase 3) — every knob in one place.
//
// ⚠️ The SECURITY DEFINER RPCs enforce these numbers server-side and carry their own
// copies (supabase/migrations/20260824190003_ticket_rpcs.sql + _190004): change BOTH
// together. The client always DISPLAYS the values the RPCs return, so the UI can't
// drift from what the database actually enforces.

export const FREE_SPOTS_PER_DAY = 20;
export const FREE_TICKETS_PER_DAY = 8;
export const ROLLOVER_CAP = 50;
export const WELCOME_BONUS = 150;
export const REVIEW_REWARD = 1;
export const REVIEW_REWARD_DAILY_CAP = 10;

// Frequent Flyer — one-off lifetime upgrade, included FREE for anyone who signs up
// during 2026 ("Founding Flyers"). Benefits: double daily Tickets, higher caps,
// no ads, a star by your name.
export const FF_PRICE_GBP = 4.99;
export const FF_FREE_SIGNUP_CUTOFF = "2027-01-01T00:00:00Z";
export const FF_DAILY_MULTIPLIER = 2;
export const FF_ROLLOVER_CAP = 100;
export const FF_REVIEW_DAILY_CAP = 20;

// Hard per-user ceiling on ALL captures in a UTC day (any verification state).
// Unconditional — not behind ENFORCE_PAYWALL: unverified spam burns paid FR24
// credits too. Far above any real user (top spotters do ~20/day).
export const ABUSE_DAILY_CAP = 200;

// IAP consumable packs — sold in the native app (Phase 5). SKUs finalised when the
// stores are configured; on the web these render as a "get it in the app" preview.
export const PACKS = [
  { sku: "tickets_10", tickets: 10, gbp: 0.99 },
  { sku: "tickets_50", tickets: 50, gbp: 2.99 },
  { sku: "tickets_150", tickets: 150, gbp: 6.99 },
] as const;

// ---- Feature flags (dark launch) ----
// Ticket packs / Frequent Flyer purchase UI: hidden everywhere until RevenueCat
// IAP ships (post-launch). Showing a purchasable-looking pack the app can't sell
// is an App Store rejection risk (guideline 2.1), so the sections render nothing.
export const PACKS_AVAILABLE = false;
// Paywall enforcement: when false there is no 402 and no spending — the economy is
// visible but nobody is blocked or charged. Flip ON at native launch (V4 Phase 5/6).
export const ENFORCE_PAYWALL = false;
// Ads: when false every AdSlot renders nothing. The real ad SDK (AdMob rewarded /
// interstitial via Capacitor) lands at native launch. Frequent Flyers never see ads.
export const ADS_ENABLED = false;

// Shape returned by the ticket_status / claim_daily_tickets RPCs.
export type TicketStatus = {
  ok: boolean;
  error?: string;
  balance: number;
  spots_used_today: number;
  captures_today: number;
  welcome_granted: boolean;
  granted_today: number;
  frequent_flyer: boolean;
  free_spots_per_day: number;
  free_tickets_per_day: number;
  rollover_cap: number;
  review_cap: number;
  granted?: number; // claim_daily_tickets only: what today's top-up actually added
};

// Ticket info attached to a successful /api/sightings response.
export type CaptureTickets = {
  balance: number;
  spentTicket: boolean;
  spotsUsedToday: number;
  freeSpotsPerDay: number;
  frequentFlyer: boolean;
};

// Window event dispatched whenever a flow changes the balance (capture, review vote);
// TicketChip and the spot HUD listen. detail: { balance?: number }.
export const TICKETS_CHANGED_EVENT = "skydex:tickets-changed";

export function announceTicketsChanged(balance?: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(TICKETS_CHANGED_EVENT, { detail: { balance } }));
  }
}
