import { ADS_ENABLED } from "@/lib/tickets";

/**
 * Dark-launched ad slot (V4). Renders nothing while ADS_ENABLED is off or the
 * viewer is a Frequent Flyer — one of FF's headline benefits is "never an ad".
 * Phase 5 (Capacitor + AdMob) swaps the internals for real units per placement:
 *   - "feed": a native-styled card between feed rows (~every 8)
 *   - "post-capture": the interstitial point after DiscoveryMoment closes
 *   - "rewarded": the /tickets "watch an ad → +1 Ticket" stub (ledger reason
 *     'ad_reward' is already reserved server-side)
 * Never a banner, and never anything on the /spot camera.
 */
export default function AdSlot(props: {
  placement: "feed" | "post-capture" | "rewarded";
  frequentFlyer?: boolean | null;
}) {
  if (!ADS_ENABLED || props.frequentFlyer) return null;
  // Phase 5: return the real ad unit for props.placement here.
  return null;
}
