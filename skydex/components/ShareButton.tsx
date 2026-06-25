"use client";

import { useState } from "react";

export default function ShareButton({ id, className = "" }: { id: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}/s/${id}`;
    const nav = navigator as Navigator & { share?: (d: { url: string; title?: string }) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({ url, title: "SkyDex sighting" });
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <button onClick={share} className={className}>
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
