"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sv = "h-5 w-5";

// Compact icon nav — keeps the bar on one line and frees space vs text labels.
const ICONS: Record<string, React.ReactNode> = {
  "/spot": (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
      <circle cx="12" cy="13" r="3" />
    </svg>
  ),
  "/scrapbook": (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    </svg>
  ),
  "/feed": (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </svg>
  ),
  "/leaderboards": (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  ),
  "/liveries": (
    <svg className={sv} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.35 5.76L20.5 9.2l-4.7 3.86L17.4 19 12 15.6 6.6 19l1.6-5.94L3.5 9.2l6.15-.44L12 3Z" />
    </svg>
  ),
};

const LINKS = [
  { href: "/spot", label: "Spot" },
  { href: "/scrapbook", label: "Scrapbook" },
  { href: "/liveries", label: "Liveries" },
  { href: "/feed", label: "Feed" },
  { href: "/leaderboards", label: "Boards" },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            title={l.label}
            aria-label={l.label}
            aria-current={active ? "page" : undefined}
            className={`flex items-center rounded-md p-2 transition-colors ${
              active
                ? "bg-sky-tint text-sky-deep"
                : "text-ink-soft hover:bg-paper-deep hover:text-ink"
            }`}
          >
            {ICONS[l.href]}
          </Link>
        );
      })}
    </>
  );
}
