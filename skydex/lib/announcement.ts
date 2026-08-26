import { RELEASES } from "@/lib/releases";

// ---- The announcement banner's single source of truth ----
//
// Two modes, one strip at the top of every page (components/AnnouncementBanner):
//  1. CAMPAIGN — a pinned banner that overrides everything while active.
//     Used for the App Store launch; arm it by setting `href` (until then it
//     falls through to mode 2), and it retires itself after `until`.
//  2. Release banner — automatic: for the first few days after any release
//     (RELEASES[0].date), announce it with a link to the home release log.
//
// Dismissals are per-banner-id in localStorage, so closing the campaign never
// hides future release banners, and each new version pops up exactly once.

export const CAMPAIGN = {
  id: "app-store-launch",
  message: "SkyDex is on the App Store — take spotting anywhere.",
  linkLabel: "Download",
  // Paste the apps.apple.com URL here when the app goes live, then deploy.
  href: null as string | null,
  until: "2026-09-21T00:00:00Z",
};

const RELEASE_BANNER_DAYS = 4;

export type Announcement = {
  id: string;
  message: string;
  href: string | null;
  linkLabel: string;
};

export function activeAnnouncement(now: number): Announcement | null {
  if (CAMPAIGN.href && now < Date.parse(CAMPAIGN.until)) {
    return { id: CAMPAIGN.id, message: CAMPAIGN.message, href: CAMPAIGN.href, linkLabel: CAMPAIGN.linkLabel };
  }
  const latest = RELEASES[0];
  if (latest && now - Date.parse(latest.date) < RELEASE_BANNER_DAYS * 86_400_000) {
    return {
      id: `release-${latest.version}`,
      message: `SkyDex v${latest.version} just landed.`,
      href: "/#whats-new",
      linkLabel: "What's new",
    };
  }
  return null;
}
