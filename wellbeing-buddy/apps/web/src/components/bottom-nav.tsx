"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/app/dashboard", label: "Home", icon: "⬜" },
  { href: "/app/checkin/morning", label: "Morning", icon: "🌅" },
  { href: "/app/checkin/evening", label: "Evening", icon: "🌙" },
  { href: "/app/chat", label: "Chat", icon: "💬" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-[var(--color-border)] bg-[var(--color-background)]/95 backdrop-blur-sm">
      <div className="flex max-w-lg mx-auto">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors ${
                active ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)]"
              }`}
            >
              <span className="text-lg leading-none">{icon}</span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
