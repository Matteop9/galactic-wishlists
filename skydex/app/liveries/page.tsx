import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ProgressWheel from "@/components/ProgressWheel";
import LiveryChecklist from "@/components/LiveryChecklist";
import {
  SPECIAL_LIVERIES,
  SPECIAL_LIVERIES_COUNT,
  normalizeReg,
} from "@/lib/specialLiveries";

export const dynamic = "force-dynamic";

export default async function LiveriesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Every registration the viewer has spotted, normalised for matching.
  const { data } = await supabase
    .from("sightings")
    .select("registration")
    .eq("user_id", user!.id);

  const known = new Set(SPECIAL_LIVERIES.map((l) => normalizeReg(l.reg)));
  // Only count regs that are actually known special liveries.
  const collected = [
    ...new Set(
      (data ?? [])
        .map((r) => normalizeReg(r.registration))
        .filter((r) => r && known.has(r)),
    ),
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-paper-edge pb-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">Special Liveries</h1>
        <Link href="/scrapbook" className="sd-btn sd-btn--log !px-4 !py-2 !text-sm">
          Scrapbook
        </Link>
      </div>

      <p className="mt-3 font-serif text-sm text-ink-soft">
        Specially-painted aircraft — anniversaries, sponsors, retro schemes and one-offs.
        Catch one and its card earns an animated frame. Tick off as many as you can.
      </p>

      {/* hero — completion front and centre */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 rounded-lg border border-paper-edge bg-paper-deep p-5 sm:justify-start">
        <ProgressWheel
          value={collected.length}
          total={SPECIAL_LIVERIES_COUNT}
          label="Liveries"
          color="var(--color-brass)"
        />
        <div className="text-center sm:text-left">
          <div className="font-display text-3xl font-bold text-ink">{collected.length}</div>
          <div className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            Collected of {SPECIAL_LIVERIES_COUNT}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <LiveryChecklist liveries={SPECIAL_LIVERIES} collected={collected} />
      </div>
    </main>
  );
}
