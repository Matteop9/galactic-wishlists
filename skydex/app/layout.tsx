import type { Metadata, Viewport } from "next";
import { Saira_Condensed, Source_Serif_4, IBM_Plex_Mono, Caveat } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Link from "next/link";
import "./globals.css";
import TopNav from "@/components/TopNav";
import MobileTabBar from "@/components/MobileTabBar";
import GuideModal from "@/components/GuideModal";
import AnnouncementBanner from "@/components/AnnouncementBanner";
import WeeklyReview from "@/components/WeeklyReview";
import { getViewer } from "@/lib/auth";
import { CURRENT_VERSION } from "@/lib/releases";

const saira = Saira_Condensed({
  variable: "--font-saira",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://skydex-two.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "SkyDex — the authentic plane-spotting logbook",
  description:
    "Photograph a real aircraft you can actually see, we verify you genuinely saw it, and it becomes a card in your scrapbook.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SkyDex", statusBarStyle: "default" },
  openGraph: {
    title: "SkyDex — the authentic plane-spotting logbook",
    description:
      "Photograph a real aircraft you can actually see, we verify you genuinely saw it, and it becomes a card in your scrapbook.",
    siteName: "SkyDex",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0E7C86",
  // Required for env(safe-area-inset-*) to resolve in standalone/PWA mode —
  // without it the tab bar sits under the iPhone home indicator.
  viewportFit: "cover",
  // SkyDex is an app, not a document: page-level pinch zoom in the iOS shell
  // gets stuck zoomed-in with no way back (feedback 26 Aug). Surfaces that
  // should zoom (map, camera, lightbox) carry their own gestures. Browsers
  // that ignore this on the open web (Safari) are unaffected either way.
  maximumScale: 1,
  userScalable: false,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, handle } = await getViewer();

  return (
    <html
      lang="en"
      className={`${saira.variable} ${sourceSerif.variable} ${plexMono.variable} ${caveat.variable} h-full antialiased`}
    >
      {/* pad the page bottom so content + footer clear the fixed tab bar,
          including the safe-area growth the bar itself gets on notched phones */}
      <body
        className={`flex min-h-full flex-col ${
          user ? "pb-[calc(68px+env(safe-area-inset-bottom))]" : ""
        }`}
      >
        <TopNav />
        <AnnouncementBanner />
        <div className="flex flex-1 flex-col">{children}</div>
        <GuideModal />
        {user && <WeeklyReview userId={user.id} />}
        <footer className="border-t border-paper-edge">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-5 py-4 font-mono text-xs text-ink-faint">
            <span>SkyDex · v{CURRENT_VERSION}</span>
            <span className="flex gap-4">
              <Link href="/support" className="hover:text-ink">Support</Link>
              <Link href="/privacy" className="hover:text-ink">Privacy</Link>
              <Link href="/terms" className="hover:text-ink">Terms</Link>
              <Link href="/attributions" className="hover:text-ink">Attributions</Link>
            </span>
          </div>
        </footer>
        {user && <MobileTabBar handle={handle} />}
        <Analytics />
      </body>
    </html>
  );
}
