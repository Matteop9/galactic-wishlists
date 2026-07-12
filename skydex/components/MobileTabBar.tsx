"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sv = "h-[22px] w-[22px]";

// The single primary nav (all viewports): a thumb-reachable fixed bottom bar
// with the core destinations plus a Profile entry.
const ICONS: Record<string, React.ReactNode> = {
  "/spot": (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  "/scrapbook": (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  "/feed": (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  ),
  "/leaderboards": (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  profile: (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
    </svg>
  ),
};

export default function MobileTabBar({ handle }: { handle: string | null }) {
  const pathname = usePathname();
  const profileHref = handle ? `/u/${handle}` : "/settings";

  // `also`: routes that belong to a tab without being under its href —
  // the Books/Liveries collections live in the Scrapbook, account pages under
  // Profile. Without this, those pages leave no tab lit; and matching bare
  // "/u/" lit Profile on *anyone's* profile, not just your own.
  // Spot sits in the middle as the raised primary action — it's THE button.
  const tabs = [
    { key: "/scrapbook", href: "/scrapbook", label: "Scrapbook", also: ["/books", "/liveries"] },
    { key: "/feed", href: "/feed", label: "Feed", also: [] as string[] },
    { key: "/spot", href: "/spot", label: "Spot", also: [] as string[] },
    { key: "/leaderboards", href: "/leaderboards", label: "Boards", also: [] as string[] },
    { key: "profile", href: profileHref, label: "Profile", also: ["/settings", "/profile", "/review"] },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-paper-edge bg-paper-deep pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto flex max-w-md items-end justify-around px-2 pt-2 pb-2">
        {tabs.map((t) => {
          const active =
            pathname === t.href ||
            pathname.startsWith(`${t.href}/`) ||
            t.also.some((p) => pathname === p || pathname.startsWith(`${p}/`));

          if (t.key === "/spot") {
            return (
              <Link
                key={t.key}
                href={t.href}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                className="-mt-7 flex flex-col items-center gap-0.5"
              >
                <span
                  className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-paper-deep shadow-lg transition-colors [&>svg]:h-7 [&>svg]:w-7 ${
                    active ? "bg-stamp text-paper" : "bg-sky text-paper hover:bg-sky-deep"
                  }`}
                >
                  {ICONS[t.key]}
                </span>
                <span
                  className={`font-display text-[10px] font-bold uppercase tracking-wide ${
                    active ? "text-stamp-deep" : "text-sky-deep"
                  }`}
                >
                  {t.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={t.key}
              href={t.href}
              aria-label={t.label}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-[10px] px-3 py-1.5 transition-colors ${
                active ? "bg-sky-tint text-sky-deep" : "text-ink-soft hover:text-ink"
              }`}
            >
              {ICONS[t.key]}
              <span className="font-display text-[10px] font-semibold uppercase tracking-wide">
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
