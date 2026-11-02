"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Coach", icon: "💬" },
  { href: "/progress", label: "Progress", icon: "📈" },
  { href: "/programme", label: "Programme", icon: "🗂" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Nav() {
  const path = usePathname();
  return (
    <nav className="pb-safe sticky bottom-0 z-20 border-t border-line bg-bg/95 backdrop-blur">
      <ul className="mx-auto flex max-w-xl justify-around">
        {TABS.map((t) => {
          const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`flex min-w-16 flex-col items-center gap-0.5 px-3 py-2 text-[11px] ${active ? "text-accent" : "text-muted"}`}
              >
                <span className="text-lg leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
