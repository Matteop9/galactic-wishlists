"use client";

import { useState } from "react";
import type { AskSpec } from "@/agent/tools/ask";
import { Card } from "./card";

const SCALE_FACES = ["💀", "😮‍💨", "😐", "🙂", "🔥"];

/** The coach's tap-to-answer form. Answers go back as one plain user message. */
export function AskCard({ spec, interactive, onAnswer }: { spec: AskSpec; interactive: boolean; onAnswer?: (text: string) => void }) {
  const [vals, setVals] = useState<Record<string, string | number | null>>({});
  const [sent, setSent] = useState(false);

  const live = interactive && !sent && !!onAnswer;
  const set = (k: string, v: string | number | null) => setVals((s) => ({ ...s, [k]: v }));

  const submit = () => {
    const bits = spec.fields
      .map((f) => {
        const v = vals[f.key];
        if (v == null || v === "") return null;
        if (f.kind === "scale") return `${f.label} ${v}/${f.max ?? 5}`;
        if (f.kind === "minutes") return `${v} min`;
        if (f.kind === "number") return `${f.label} ${v}${f.unit ? ` ${f.unit}` : ""}`;
        if (f.kind === "choice") return `${f.label}: ${v}`;
        return String(v);
      })
      .filter(Boolean);
    if (bits.length === 0) return;
    setSent(true);
    onAnswer?.(bits.join(" · "));
  };

  const required = spec.fields.filter((f) => !f.optional);
  const ready = required.every((f) => vals[f.key] != null && vals[f.key] !== "");

  return (
    <Card tone="accent">
      {spec.title && <div className="mb-2 text-sm font-medium">{spec.title}</div>}
      <div className="space-y-2.5">
        {spec.fields.map((f) => (
          <div key={f.key}>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">
              {f.label}
              {f.optional ? " · optional" : ""}
            </div>
            {f.kind === "scale" && (
              <div className="flex gap-1.5">
                {Array.from({ length: (f.max ?? 5) - (f.min ?? 1) + 1 }, (_, i) => (f.min ?? 1) + i).map((n, i, arr) => (
                  <button
                    key={n}
                    type="button"
                    disabled={!live}
                    onClick={() => set(f.key, n)}
                    className={`tabular h-11 flex-1 rounded-xl border text-base ${vals[f.key] === n ? "border-accent bg-accent/15" : "border-line bg-surface-2"} disabled:opacity-60`}
                  >
                    {arr.length === 5 ? SCALE_FACES[i] : n}
                  </button>
                ))}
              </div>
            )}
            {f.kind === "choice" && (
              <div className="flex flex-wrap gap-1.5">
                {(f.options ?? []).map((o) => (
                  <button
                    key={o}
                    type="button"
                    disabled={!live}
                    onClick={() => set(f.key, o)}
                    className={`h-10 min-w-12 rounded-xl border px-3 text-sm ${vals[f.key] === o ? "border-accent bg-accent/15" : "border-line bg-surface-2"} disabled:opacity-60`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            )}
            {(f.kind === "number" || f.kind === "minutes") && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  disabled={!live}
                  value={vals[f.key] ?? ""}
                  onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))}
                  className="tabular h-11 w-24 rounded-xl border border-line bg-surface-2 px-3 text-center text-[16px] outline-none focus:border-accent disabled:opacity-60"
                />
                <span className="text-xs text-muted">{f.kind === "minutes" ? "min" : f.unit}</span>
              </div>
            )}
            {f.kind === "text" && (
              <input
                type="text"
                disabled={!live}
                value={(vals[f.key] as string) ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="h-11 w-full rounded-xl border border-line bg-surface-2 px-3 text-[16px] outline-none focus:border-accent disabled:opacity-60"
              />
            )}
          </div>
        ))}
      </div>
      {live ? (
        <button type="button" onClick={submit} disabled={!ready} className="mt-3 h-11 w-full rounded-xl bg-accent text-sm font-medium text-black disabled:opacity-40">
          {spec.submit_label ?? "Send"}
        </button>
      ) : (
        <div className="mt-2 text-[11px] text-muted">{sent ? "Sent." : "Answered below."}</div>
      )}
    </Card>
  );
}
