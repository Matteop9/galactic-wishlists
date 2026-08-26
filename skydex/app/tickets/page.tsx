import Link from "next/link";
import { redirect } from "next/navigation";
import SectionShell from "@/components/SectionShell";
import AdSlot from "@/components/AdSlot";
import { TicketGlyph } from "@/components/TicketChip";
import { createClient } from "@/lib/supabase/server";
import { FF_PRICE_GBP, PACKS, PACKS_AVAILABLE, type TicketStatus } from "@/lib/tickets";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tickets — SkyDex" };

const REASON_LABEL: Record<string, string> = {
  welcome: "Welcome bonus",
  daily_grant: "Daily grant",
  spend_capture: "Extra spot",
  purchase: "Ticket pack",
  ad_reward: "Watched an ad",
  review_reward: "Photo review",
  admin_adjust: "Adjustment",
  refund: "Refund",
};

function ledgerDate(iso: string) {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(d);
  return `${day} · ${time}Z`;
}

const FF_BENEFITS = [
  "Double daily Tickets (16 a day instead of 8)",
  "Bigger stockpile — roll over up to 100 Tickets",
  "Earn up to 20 Tickets a day reviewing photos",
  "Never see an ad",
  "A ✦ by your name everywhere",
];

export default async function TicketsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/tickets");

  // Opening this page also claims the daily grant (idempotent per UTC day).
  const { data: claimData } = await supabase.rpc("claim_daily_tickets");
  const status = (claimData ?? null) as TicketStatus | null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("frequent_flyer, frequent_flyer_since, frequent_flyer_source")
    .eq("id", user.id)
    .maybeSingle();
  const isFF = Boolean(profile?.frequent_flyer);
  const isFounder = profile?.frequent_flyer_source === "founder";

  const { data: ledger } = await supabase
    .from("ticket_ledger")
    .select("id, delta, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const balance = status?.balance ?? 0;
  const freeSpots = status?.free_spots_per_day ?? 20;
  const spotsUsed = status?.spots_used_today ?? 0;
  const dailyTickets = status?.free_tickets_per_day ?? 8;
  const rolloverCap = status?.rollover_cap ?? 50;
  const reviewCap = status?.review_cap ?? 10;

  return (
    <SectionShell
      title="Tickets"
      subtitle={`Your first ${freeSpots} verified spots each day are free — Tickets cover anything beyond that. Right now spotting stays free past the line too; Tickets come into play down the road.`}
    >
      <div className="space-y-8">
        {/* Balance — styled as the boarding-pass stub */}
        <section className="rounded-xl border-2 border-ink bg-paper-deep p-5">
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
            <div>
              <div className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ink-faint">
                Ticket balance
              </div>
              <div className="mt-1 flex items-center gap-3">
                <TicketGlyph className="h-9 w-9 shrink-0 text-brass" />
                <span className="font-display text-5xl font-bold tabular-nums text-ink">
                  {balance}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-xs font-bold uppercase tracking-[0.2em] text-ink-faint">
                Spots today
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-ink">
                {spotsUsed}
                <span className="text-ink-faint">/{freeSpots}</span>
              </div>
              <div className="font-mono text-[11px] text-ink-soft">free verified spots</div>
            </div>
          </div>
          {status && status.granted != null && status.granted > 0 && (
            <p className="mt-3 border-t border-paper-edge pt-3 font-mono text-xs text-sky-deep">
              +{status.granted} daily Tickets collected — welcome back.
            </p>
          )}
        </section>

        {/* Earn */}
        <section>
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink">
            How you earn
          </h2>
          <ul className="mt-3 divide-y divide-paper-edge rounded-xl border border-paper-edge bg-paper-deep">
            <li className="flex items-start justify-between gap-4 p-4">
              <div>
                <div className="font-semibold text-ink">Open the app each day</div>
                <div className="mt-0.5 text-sm text-ink-soft">
                  A daily top-up toward your {rolloverCap}-Ticket stockpile cap — it resumes
                  automatically whenever you&apos;re below the cap.
                </div>
              </div>
              <div className="shrink-0 font-mono text-sm font-semibold text-sky-deep">
                +{dailyTickets}/day
              </div>
            </li>
            <li className="flex items-start justify-between gap-4 p-4">
              <div>
                <div className="font-semibold text-ink">Review other spotters&apos; photos</div>
                <div className="mt-0.5 text-sm text-ink-soft">
                  One Ticket per photo you review, up to {reviewCap} a day.{" "}
                  <Link href="/review" className="font-semibold text-sky-deep underline">
                    Review photos →
                  </Link>
                </div>
              </div>
              <div className="shrink-0 font-mono text-sm font-semibold text-sky-deep">
                +1 each
              </div>
            </li>
            <li className="flex items-start justify-between gap-4 p-4">
              <div>
                <div className="font-semibold text-ink">Welcome bonus</div>
                <div className="mt-0.5 text-sm text-ink-soft">
                  {status?.welcome_granted
                    ? "Every new spotter starts with a stack — yours is already in the ledger below."
                    : "Every new spotter starts with a stack, granted on your first visit."}
                </div>
              </div>
              <div className="shrink-0 font-mono text-sm font-semibold text-sky-deep">+150 once</div>
            </li>
          </ul>
          {/* Phase 5 adds "watch an ad → +1 Ticket" here for free users */}
          <AdSlot placement="rewarded" frequentFlyer={isFF} />
        </section>

        {/* Frequent Flyer */}
        <section>
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink">
            Frequent Flyer
          </h2>
          {isFF ? (
            <div className="mt-3 rounded-xl border-2 border-brass bg-paper-deep p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="font-display text-xl font-bold uppercase tracking-[0.15em] text-brass">
                  ✦ Frequent Flyer
                </div>
                {profile?.frequent_flyer_since && (
                  <div className="font-mono text-[11px] uppercase text-ink-faint">
                    since{" "}
                    {new Intl.DateTimeFormat("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(profile.frequent_flyer_since))}
                  </div>
                )}
              </div>
              {isFounder && (
                <p className="mt-2 text-sm font-semibold text-ink">
                  Founding Flyer — included free, forever, for joining SkyDex in 2026.
                </p>
              )}
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {FF_BENEFITS.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-brass">✦</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-paper-edge bg-paper-deep p-5">
              <div className="flex items-baseline justify-between gap-4">
                <div className="font-display text-xl font-bold uppercase tracking-[0.15em] text-ink">
                  ✦ Frequent Flyer
                </div>
                {PACKS_AVAILABLE && (
                  <div className="font-mono text-sm font-semibold text-ink">
                    £{FF_PRICE_GBP.toFixed(2)}{" "}
                    <span className="text-ink-faint">once, forever</span>
                  </div>
                )}
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-ink-soft">
                {FF_BENEFITS.map((b) => (
                  <li key={b} className="flex gap-2">
                    <span className="text-brass">✦</span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-md bg-paper px-3 py-2 font-mono text-xs text-ink-soft">
                {PACKS_AVAILABLE
                  ? "Upgrade in the SkyDex app."
                  : "Included free, forever, for everyone who joins SkyDex in 2026 — open the app each day and it's yours."}
              </p>
            </div>
          )}
        </section>

        {/* Packs (native IAP) — hidden until RevenueCat ships: a purchasable-looking
            pack the app can't actually sell is an App Store rejection risk. */}
        {PACKS_AVAILABLE && (
          <section>
            <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink">
              Ticket packs
            </h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {PACKS.map((p) => (
                <div
                  key={p.sku}
                  className="rounded-xl border border-dashed border-paper-edge bg-paper-deep p-4 text-center opacity-80"
                >
                  <TicketGlyph className="mx-auto h-6 w-6 text-brass" />
                  <div className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
                    {p.tickets}
                  </div>
                  <div className="font-mono text-xs text-ink-soft">£{p.gbp.toFixed(2)}</div>
                </div>
              ))}
            </div>
            <p className="mt-3 font-mono text-xs text-ink-soft">Buy packs in the SkyDex app.</p>
          </section>
        )}

        {/* Ledger */}
        <section>
          <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink">
            Ticket history
          </h2>
          {ledger && ledger.length > 0 ? (
            <ul className="mt-3 divide-y divide-paper-edge rounded-xl border border-paper-edge bg-paper-deep">
              {ledger.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-4 px-4 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">
                      {REASON_LABEL[row.reason] ?? row.reason}
                    </div>
                    <div className="font-mono text-[11px] text-ink-faint">
                      {ledgerDate(row.created_at)}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 font-mono text-sm font-bold tabular-nums ${
                      row.delta >= 0 ? "text-sky-deep" : "text-stamp"
                    }`}
                  >
                    {row.delta >= 0 ? `+${row.delta}` : row.delta}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-soft">
              Nothing yet — your welcome bonus lands the moment the economy opens its doors.
            </p>
          )}
        </section>
      </div>
    </SectionShell>
  );
}
