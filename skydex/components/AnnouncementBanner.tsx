"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { activeAnnouncement, type Announcement } from "@/lib/announcement";

const DISMISS_KEY = "skydex_banner_dismissed";

/** Top-of-page announcement strip (campaign or fresh-release — lib/announcement).
 *  Renders nothing on the server and until mounted: dismissal lives in
 *  localStorage, so deciding during SSR would hydrate wrong. */
export default function AnnouncementBanner() {
  const [ann, setAnn] = useState<Announcement | null>(null);

  useEffect(() => {
    // Deferred a tick (react-hooks/set-state-in-effect).
    const t = setTimeout(() => {
      const a = activeAnnouncement(Date.now());
      if (!a) return;
      try {
        if (localStorage.getItem(DISMISS_KEY) === a.id) return;
      } catch {
        // storage unavailable — show it; dismissal just won't stick
      }
      setAnn(a);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  if (!ann) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, ann.id);
    } catch {}
    setAnn(null);
  };

  const external = ann.href?.startsWith("http");

  return (
    <div className="sd-banner flex items-center justify-center gap-3 bg-sky px-4 py-2 text-paper">
      <span className="font-mono text-xs">
        <span aria-hidden>✈ </span>
        {ann.message}
      </span>
      {ann.href &&
        (external ? (
          <a
            href={ann.href}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-md border border-paper/60 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide hover:bg-paper hover:text-sky-deep"
          >
            {ann.linkLabel}
          </a>
        ) : (
          <Link
            href={ann.href}
            className="shrink-0 rounded-md border border-paper/60 px-2.5 py-0.5 font-display text-xs font-bold uppercase tracking-wide hover:bg-paper hover:text-sky-deep"
          >
            {ann.linkLabel}
          </Link>
        ))}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="shrink-0 rounded p-1 leading-none text-paper/80 hover:text-paper"
      >
        ✕
      </button>
    </div>
  );
}
