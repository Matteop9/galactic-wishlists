"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { progressData } from "@/lib/dashboard";

type Data = Awaited<ReturnType<typeof progressData>>;

const C1 = "var(--chart-1)";
const C2 = "var(--chart-2)";
const tick = { fill: "var(--muted)", fontSize: 10 };
const tooltip = { contentStyle: { background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }, labelStyle: { color: "var(--muted)" } };
const md = (d: string) => d.slice(5);

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 rounded-2xl border border-line bg-surface p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{title}</h2>
        {sub && <span className="tabular text-xs text-muted">{sub}</span>}
      </div>
      {children}
    </section>
  );
}

function Empty({ what }: { what: string }) {
  return <p className="py-6 text-center text-sm text-muted">No {what} yet.</p>;
}

export function ProgressCharts({ data }: { data: Data }) {
  const last = data.trend.at(-1);
  const muscles = Object.entries(data.volume.volume).sort(([, a], [, b]) => b - a);
  return (
    <div>
      <Section title="Weight" sub={last ? `trend ${last.trend.toFixed(1)} kg · ${data.rate != null ? `${data.rate > 0 ? "+" : ""}${data.rate.toFixed(2)} kg/wk` : "rate n/a"}` : undefined}>
        {data.trend.length < 2 ? (
          <Empty what="weigh-ins" />
        ) : (
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={data.trend.map((p) => ({ ...p, date: md(p.date) }))} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} minTickGap={28} />
                <YAxis tick={tick} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip {...tooltip} />
                <Line type="monotone" dataKey="weight" name="reading" stroke="var(--muted)" strokeWidth={0} dot={{ r: 2, fill: "var(--muted)", strokeWidth: 0 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="trend" name="trend" stroke={C1} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-1 flex gap-3 text-[11px] text-muted">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: C1 }} />trend</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-muted" />daily reading</span>
            </div>
          </div>
        )}
      </Section>

      <Section title="Sessions per week" sub="target 3 + 3">
        {data.weeks.every((w) => w.liftSessions + w.cardioSessions === 0) ? (
          <Empty what="sessions" />
        ) : (
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={data.weeks.map((w) => ({ week: md(w.weekStart), lifts: w.liftSessions, cardio: w.cardioSessions }))} margin={{ top: 4, right: 4, bottom: 0, left: -24 }} barGap={2}>
                <CartesianGrid stroke="var(--line)" vertical={false} />
                <XAxis dataKey="week" tick={tick} axisLine={false} tickLine={false} />
                <YAxis tick={tick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltip} />
                <Bar dataKey="lifts" fill={C1} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="cardio" fill={C2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-1 flex gap-3 text-[11px] text-muted">
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: C1 }} />lifts</span>
              <span><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: C2 }} />cardio</span>
            </div>
          </div>
        )}
      </Section>

      <Section title="Hard sets per muscle" sub={`week of ${md(data.volume.weekStart)} · band 10–20`}>
        {muscles.length === 0 ? (
          <Empty what="sets this week" />
        ) : (
          <ul className="space-y-1.5">
            {muscles.map(([m, n]) => (
              <li key={m} className="flex items-center gap-2 text-xs">
                <span className="w-24 truncate text-muted">{m.replace("_", " ")}</span>
                <div className="relative h-3 flex-1 overflow-hidden rounded-full bg-surface-2">
                  <div className="absolute inset-y-0 bg-line/60" style={{ left: `${(10 / 24) * 100}%`, width: `${(10 / 24) * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, (n / 24) * 100)}%`, background: n < 10 ? "var(--warn)" : C1 }} />
                </div>
                <span className="tabular w-8 text-right">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Strength (e1RM)" sub="best per session">
        {data.lifts.length === 0 ? (
          <Empty what="lift history" />
        ) : (
          data.lifts.map((l) => (
            <div key={l.name} className="mb-3">
              <div className="mb-1 flex justify-between text-xs">
                <span>{l.name}</span>
                <span className="tabular text-muted">
                  {l.points[0].value.toFixed(0)} → {l.points.at(-1)!.value.toFixed(0)} kg
                </span>
              </div>
              <div className="h-24">
                <ResponsiveContainer>
                  <LineChart data={l.points.map((p) => ({ date: md(p.date), e1rm: p.value }))} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="date" tick={tick} axisLine={false} tickLine={false} minTickGap={28} />
                    <YAxis tick={tick} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                    <Tooltip {...tooltip} />
                    <Line type="monotone" dataKey="e1rm" stroke={C1} strokeWidth={2} dot={{ r: 3, fill: C1, strokeWidth: 0 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))
        )}
      </Section>

      <Section title="Cardio" sub="speed at RPE, per machine">
        {data.cardio.length === 0 ? (
          <Empty what="cardio" />
        ) : (
          data.cardio.map((m) => (
            <div key={m.machine} className="mb-3">
              <div className="mb-1 text-xs capitalize">{m.machine.replace("_", " ")} · {m.points.length} sessions</div>
              <ul className="divide-y divide-line text-xs">
                {m.points.slice(-6).map((p, i) => (
                  <li key={i} className="tabular flex justify-between py-1">
                    <span className="text-muted">{md(p.date)}</span>
                    <span>{p.minutes} min{p.speed != null ? ` · ${p.speed} km/h` : ""}{p.rpe != null ? ` · RPE ${p.rpe}` : ""}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Section>

      <Section title="Weekly table">
        <div className="overflow-x-auto">
          <table className="tabular w-full text-xs">
            <thead className="text-muted">
              <tr>
                <th className="py-1 text-left font-normal">week</th>
                <th className="font-normal">lifts</th>
                <th className="font-normal">cardio</th>
                <th className="font-normal">min</th>
                <th className="font-normal">sets</th>
                <th className="font-normal">Δ kg</th>
                <th className="font-normal">steps</th>
                <th className="font-normal">units</th>
              </tr>
            </thead>
            <tbody>
              {[...data.weeks].reverse().map((w) => (
                <tr key={w.weekStart} className="border-t border-line">
                  <td className="py-1 text-left">{md(w.weekStart)}</td>
                  <td className="text-center">{w.liftSessions}</td>
                  <td className="text-center">{w.cardioSessions}</td>
                  <td className="text-center">{w.cardioMinutes}</td>
                  <td className="text-center">{w.hardSets}</td>
                  <td className={`text-center ${w.weightChangeKg != null && w.weightChangeKg < 0 ? "text-accent" : ""}`}>{w.weightChangeKg ?? "–"}</td>
                  <td className="text-center">{w.steps ?? "–"}</td>
                  <td className="text-center">{w.alcoholUnits ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}
