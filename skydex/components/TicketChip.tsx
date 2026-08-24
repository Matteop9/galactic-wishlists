"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TICKETS_CHANGED_EVENT, type TicketStatus } from "@/lib/tickets";

/** The plane-ticket glyph (same path as the avatar motif in lib/avatar.ts). */
export function TicketGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round">
        <path d="M24 38 L76 38 Q76 46 80 48 Q76 50 76 58 L76 72 L24 72 L24 58 Q28 50 24 48 Q28 46 24 38 Z" />
        <path d="M58 38 L58 72" strokeDasharray="3 5" />
      </g>
    </svg>
  );
}

/**
 * Header balance chip. Mounting it is also what claims the daily grant (and the
 * one-time welcome bonus / Founding-Flyer status) — claim_daily_tickets is
 * grant-on-read and idempotent per UTC day, so there is no cron.
 */
export default function TicketChip() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let alive = true;
    void supabase.rpc("claim_daily_tickets").then(({ data }) => {
      const s = data as TicketStatus | null;
      if (alive && s?.ok) setBalance(s.balance);
    });
    // Capture/review flows announce balance changes app-wide (no prop drilling).
    const onChange = (e: Event) => {
      const d = (e as CustomEvent).detail as { balance?: number } | undefined;
      if (typeof d?.balance === "number") {
        setBalance(d.balance);
      } else {
        void supabase.rpc("ticket_status").then(({ data }) => {
          const s = data as TicketStatus | null;
          if (alive && s?.ok) setBalance(s.balance);
        });
      }
    };
    window.addEventListener(TICKETS_CHANGED_EVENT, onChange);
    return () => {
      alive = false;
      window.removeEventListener(TICKETS_CHANGED_EVENT, onChange);
    };
  }, []);

  return (
    <Link
      href="/tickets"
      aria-label={balance == null ? "Tickets" : `${balance} Tickets`}
      title="Tickets"
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-paper-edge bg-paper-deep px-2.5 py-1 font-mono text-xs font-semibold text-ink-soft transition-colors hover:border-brass hover:text-ink"
    >
      <TicketGlyph className="h-4 w-4 text-brass" />
      <span className="tabular-nums">{balance ?? "–"}</span>
    </Link>
  );
}
