"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "./card";

export type ChartSpec = {
  title: string;
  kind: "line" | "bar";
  yLabel?: string;
  series: Array<{ name: string; points: Array<{ x: string; y: number }> }>;
  band?: { from: number; to: number; label?: string };
};

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function ChartCard({ spec }: { spec: ChartSpec }) {
  // merge series on x
  const xs = [...new Set(spec.series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const data = xs.map((x) => {
    const row: Record<string, string | number | null> = { x: x.length === 10 ? x.slice(5) : x };
    for (const s of spec.series) row[s.name] = s.points.find((p) => p.x === x)?.y ?? null;
    return row;
  });
  const Chart = spec.kind === "bar" ? BarChart : LineChart;
  return (
    <Card>
      <div className="mb-1 text-sm font-medium">{spec.title}</div>
      <div className="h-44 w-full">
        <ResponsiveContainer>
          <Chart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis dataKey="x" tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 10 }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ background: "var(--surface-2)", border: "1px solid var(--line)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "var(--muted)" }} />
            {spec.band && <ReferenceArea y1={spec.band.from} y2={spec.band.to} fill="var(--chart-1)" fillOpacity={0.1} />}
            {spec.series.map((s, i) =>
              spec.kind === "bar" ? (
                <Bar key={s.name} dataKey={s.name} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
              ) : (
                <Line key={s.name} type="monotone" dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} connectNulls />
              ),
            )}
          </Chart>
        </ResponsiveContainer>
      </div>
      {spec.series.length > 1 && (
        <div className="mt-1 flex gap-3 text-[11px] text-muted">
          {spec.series.map((s, i) => (
            <span key={s.name} className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
