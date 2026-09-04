"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useDialog } from "@/components/useDialog";
import MascotSays from "@/components/MascotSays";

const SEEN_KEY = "skydex_guide_seen";

// Only auto-open where onboarding makes sense — not on legal pages or a shared
// card link someone landed on from outside.
const AUTO_OPEN_ROUTES = ["/", "/spot", "/scrapbook", "/feed"];

const STEPS: [string, string][] = [
  ["Find a plane", "Spot an aircraft you can actually see overhead — near an airport or flight path works best."],
  ["Aim", "Open Spot, allow camera + motion, and point at it. The reticle turns red when a real flight lines up — you're in sights."],
  ["Capture", "Tap Capture. SkyDex checks your location, time and direction against live flight data to verify you genuinely saw it."],
  ["Collect", "A verified sighting becomes a card stamped with the real flight details and graded by rarity, Common → Legendary."],
  ["Complete & share", "Fill your Books (by type, airline, rarity), share cards, comment on the global feed, and chase rare spots."],
];

export default function GuideModal() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    let raf: number | null = null;
    if (!localStorage.getItem(SEEN_KEY) && AUTO_OPEN_ROUTES.includes(pathname)) {
      raf = requestAnimationFrame(() => setOpen(true));
    }
    const handler = () => setOpen(true);
    window.addEventListener("skydex:open-guide", handler);
    return () => {
      if (raf != null) cancelAnimationFrame(raf);
      window.removeEventListener("skydex:open-guide", handler);
    };
  }, [pathname]);

  function close() {
    localStorage.setItem(SEEN_KEY, "1");
    // She introduces herself in the guide, so the standalone intro card
    // (components/MascotMoments) must not follow this up.
    localStorage.setItem("skydex_mascot_intro_seen", "1");
    setOpen(false);
  }

  if (!open) return null;

  return <GuideDialog onClose={close} />;
}

function GuideDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useDialog(onClose);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="How SkyDex works"
      tabIndex={-1}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 outline-none"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-ink bg-paper p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-stamp">Welcome to</p>
        <h2 className="font-display text-3xl font-bold tracking-tight text-ink">
          Sky<span className="text-sky">Dex</span>
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          A real logbook of the sky — you photograph planes you can actually see, and we verify them.
        </p>

        {/* Companion greets once, at step 1 only (design handoff: steps 2–5 without her). */}
        <MascotSays pose="point" size={56} className="mt-4" plainClassName="hidden">
          Eyes up. There&apos;s one coming over now.
        </MascotSays>

        <ol className="mt-4 flex flex-col gap-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky font-display text-sm font-bold text-paper">
                {i + 1}
              </span>
              <span>
                <span className="font-display font-semibold uppercase tracking-wide text-ink">
                  {title}
                </span>
                <span className="block text-sm text-ink-soft">{body}</span>
              </span>
            </li>
          ))}
        </ol>

        <button onClick={onClose} className="sd-btn sd-btn--capture mt-6 w-full justify-center">
          Start spotting
        </button>
      </div>
    </div>
  );
}
