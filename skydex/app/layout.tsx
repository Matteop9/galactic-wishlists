import type { Metadata, Viewport } from "next";
import { Saira_Condensed, Source_Serif_4, IBM_Plex_Mono, Caveat } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import TopNav from "@/components/TopNav";
import GuideModal from "@/components/GuideModal";
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

export const metadata: Metadata = {
  title: "SkyDex — the authentic plane-spotting logbook",
  description:
    "Photograph a real aircraft you can actually see, we verify you genuinely saw it, and it becomes a card in your scrapbook.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SkyDex", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0E7C86",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${saira.variable} ${sourceSerif.variable} ${plexMono.variable} ${caveat.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <TopNav />
        <div className="flex flex-1 flex-col">{children}</div>
        <GuideModal />
        <footer className="border-t border-paper-edge">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-2 px-5 py-4 font-mono text-xs text-ink-faint">
            <span>SkyDex · v{CURRENT_VERSION}</span>
            <span className="flex gap-4">
              <Link href="/privacy" className="hover:text-ink">Privacy</Link>
              <Link href="/terms" className="hover:text-ink">Terms</Link>
              <Link href="/attributions" className="hover:text-ink">Attributions</Link>
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
