"use client";

import { useState } from "react";
import {
  AppData,
  INTEREST_META,
  Member,
  getResponse,
} from "@/lib/types";
import {
  STATUS_STYLES,
  formatKickoff,
  groupDeadline,
  orderStatus,
} from "@/lib/format";
import { INTEREST_STYLES } from "@/lib/ui";

export default function Deadlines({
  data,
  currentMember,
}: {
  data: AppData;
  currentMember: Member | null;
}) {
  const [showPast, setShowPast] = useState(false);
  const now = new Date();

  const games = [...data.games].sort((a, b) =>
    groupDeadline(a).localeCompare(groupDeadline(b))
  );
  const upcoming = games.filter((g) => new Date(groupDeadline(g)) >= now);
  const past = games.filter((g) => new Date(groupDeadline(g)) < now);
  const visible = showPast ? games : upcoming;

  // Group by "August 2026" style month of the deadline
  const groups: { month: string; games: typeof games }[] = [];
  for (const game of visible) {
    const month = new Date(groupDeadline(game)).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    const last = groups[groups.length - 1];
    if (last && last.month === month) last.games.push(game);
    else groups.push({ month, games: [game] });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-slate-500">
          Every deadline in order — away games show the date requests must be
          with Neil (before the window opens); home games show when the window
          closes.
        </p>
        {past.length > 0 && (
          <button
            onClick={() => setShowPast((v) => !v)}
            className="ml-3 shrink-0 text-xs font-medium text-slate-400 underline"
          >
            {showPast ? "Hide past" : `Show ${past.length} past`}
          </button>
        )}
      </div>

      {visible.length === 0 && (
        <p className="py-10 text-center text-sm text-slate-400">
          No upcoming deadlines.
        </p>
      )}

      {groups.map((group) => (
        <div key={group.month} className="mb-4">
          <h3 className="mb-1.5 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
            {group.month}
          </h3>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {group.games.map((game) => {
              const deadline = new Date(groupDeadline(game));
              const status = orderStatus(game, now);
              const passed = deadline < now;
              const myInterest = currentMember
                ? getResponse(data, game.id, currentMember.id).interest
                : null;
              return (
                <div
                  key={game.id}
                  className={`flex items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0 ${
                    passed ? "opacity-50" : ""
                  }`}
                >
                  <div className="w-11 shrink-0 text-center">
                    <div className="text-lg font-bold leading-none text-slate-800">
                      {deadline.getDate()}
                    </div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">
                      {deadline.toLocaleDateString("en-GB", {
                        weekday: "short",
                      })}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-slate-800">
                        {game.opponent}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold text-white ${
                          game.homeAway === "H" ? "bg-chelsea" : "bg-slate-600"
                        }`}
                      >
                        {game.homeAway}
                      </span>
                      {game.loyaltyPoints && (
                        <span className="text-xs text-yellow-600">★</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {game.homeAway === "A"
                        ? "Requests to Neil by "
                        : "Apply by "}
                      {deadline.toLocaleTimeString("en-GB", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {" · kickoff "}
                      {formatKickoff(game.date)}
                    </div>
                  </div>
                  {myInterest && (
                    <span
                      title={`You: ${INTEREST_META[myInterest].label}`}
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${INTEREST_STYLES[myInterest]}`}
                    >
                      {INTEREST_META[myInterest].symbol}
                    </span>
                  )}
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[status.key]}`}
                  >
                    {status.key === "closed"
                      ? "Closed"
                      : status.key === "upcoming"
                        ? "Not open yet"
                        : status.key === "closing"
                          ? "Closing soon"
                          : "Open"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
