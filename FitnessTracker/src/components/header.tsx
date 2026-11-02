"use client";

export type HeaderData = {
  activeWorkout: { id: number; name: string; startedAt: string; sets: number } | null;
  nextWorkout: string | null;
  trendKg: number | null;
  rateKg: number | null;
  lifts: number;
  cardio: number;
  liftTarget: number;
  cardioTarget: number;
};

function Ring({ done, target, color }: { done: number; target: number; color: string }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, target ? done / target : 0);
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" className="-rotate-90">
      <circle cx="13" cy="13" r={r} stroke="var(--line)" strokeWidth="3" fill="none" />
      <circle cx="13" cy="13" r={r} stroke={color} strokeWidth="3" fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" />
    </svg>
  );
}

export function Header({ data }: { data: HeaderData }) {
  const rate = data.rateKg;
  return (
    <header className="pt-safe sticky top-0 z-10 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2">
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted">{data.activeWorkout ? "In session" : "Next up"}</div>
          <div className="truncate font-medium">
            {data.activeWorkout ? `${data.activeWorkout.name} · ${data.activeWorkout.sets} sets` : (data.nextWorkout ?? "No programme yet")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted">Trend</div>
          <div className="tabular font-medium">
            {data.trendKg != null ? `${data.trendKg.toFixed(1)} kg` : "—"}
            {rate != null && (
              <span className={`ml-1 text-xs ${rate < 0 ? "text-accent" : rate > 0 ? "text-warn" : "text-muted"}`}>
                {rate > 0 ? "+" : ""}
                {rate.toFixed(2)}/wk
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5" title={`Lifts ${data.lifts}/${data.liftTarget} · Cardio ${data.cardio}/${data.cardioTarget}`}>
          <div className="flex flex-col items-center">
            <Ring done={data.lifts} target={data.liftTarget} color="var(--accent)" />
            <span className="text-[10px] text-muted">{data.lifts}/{data.liftTarget}</span>
          </div>
          <div className="flex flex-col items-center">
            <Ring done={data.cardio} target={data.cardioTarget} color="var(--accent-2)" />
            <span className="text-[10px] text-muted">{data.cardio}/{data.cardioTarget}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
