import { Interest, Outcome } from "./types";

/** Filled button / chip styles per interest level. */
export const INTEREST_STYLES: Record<Interest, string> = {
  definitely: "bg-emerald-600 text-white border-emerald-600",
  yes: "bg-green-500 text-white border-green-500",
  if_others: "bg-teal-400 text-teal-950 border-teal-400",
  maybe: "bg-amber-400 text-amber-950 border-amber-400",
  depends_time: "bg-orange-400 text-orange-950 border-orange-400",
  direct: "bg-indigo-500 text-white border-indigo-500",
  away: "bg-sky-400 text-sky-950 border-sky-400",
  busy: "bg-slate-400 text-white border-slate-400",
  not: "bg-rose-600 text-white border-rose-600",
};

export const INTEREST_IDLE_STYLE =
  "bg-white text-slate-500 border-slate-200 hover:border-slate-400";

export const OUTCOME_STYLES: Record<Outcome, string> = {
  pending: "bg-sky-100 text-sky-800 border border-sky-200",
  success: "bg-emerald-600 text-white border border-emerald-600",
  unsuccessful: "bg-rose-100 text-rose-700 border border-rose-200",
};

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
