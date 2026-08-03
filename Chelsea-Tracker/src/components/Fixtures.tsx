"use client";

import { useState } from "react";
import {
  AppData,
  Game,
  INTEREST_META,
  INTEREST_ORDER,
  Member,
  PatchFn,
  getResponse,
} from "@/lib/types";
import {
  STATUS_STYLES,
  formatKickoff,
  formatWindowPoint,
  orderStatus,
} from "@/lib/format";
import { INTEREST_IDLE_STYLE, INTEREST_STYLES, initials } from "@/lib/ui";

type Filter = "all" | "open" | "unanswered";

export default function Fixtures({
  data,
  currentMember,
  patch,
}: {
  data: AppData;
  currentMember: Member | null;
  patch: PatchFn;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [showPast, setShowPast] = useState(false);

  const now = new Date();
  const todayISO = now.toISOString().slice(0, 10);

  const isPast = (g: Game) => g.date < todayISO;

  const visible = data.games.filter((g) => {
    if (!showPast && isPast(g)) return false;
    const status = orderStatus(g, now);
    if (filter === "open")
      return status.key === "open" || status.key === "closing";
    if (filter === "unanswered") {
      if (status.key === "closed") return false;
      if (!currentMember) return true;
      return getResponse(data, g.id, currentMember.id).interest === null;
    }
    return true;
  });

  const pastCount = data.games.filter(isPast).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(
          [
            ["all", "All games"],
            ["open", "Open now"],
            ["unanswered", "Needs my answer"],
          ] as [Filter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === key
                ? "bg-chelsea text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:border-chelsea"
            }`}
          >
            {label}
          </button>
        ))}
        {pastCount > 0 && (
          <button
            onClick={() => setShowPast((v) => !v)}
            className="ml-auto text-xs font-medium text-slate-400 underline"
          >
            {showPast ? "Hide" : "Show"} {pastCount} past game
            {pastCount === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {!currentMember && (
        <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-chelsea">
          Pick who you are (top right) to record your interest.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">
            No games match this filter.
          </p>
        )}
        {visible.map((game) => (
          <GameCard
            key={game.id}
            data={data}
            game={game}
            currentMember={currentMember}
            patch={patch}
          />
        ))}
      </div>
    </div>
  );
}

function GameCard({
  data,
  game,
  currentMember,
  patch,
}: {
  data: AppData;
  game: Game;
  currentMember: Member | null;
  patch: PatchFn;
}) {
  const status = orderStatus(game);
  const myResponse = currentMember
    ? getResponse(data, game.id, currentMember.id)
    : null;
  const activeMembers = data.members.filter((m) => m.active);

  const appliedMembers = activeMembers.filter(
    (m) => getResponse(data, game.id, m.id).applied
  );
  const successCount = appliedMembers.filter(
    (m) => getResponse(data, game.id, m.id).outcome === "success"
  ).length;

  const setInterest = async (
    interest: (typeof INTEREST_ORDER)[number]
  ): Promise<void> => {
    if (!currentMember) return;
    await patch({
      type: "setInterest",
      gameId: game.id,
      memberId: currentMember.id,
      interest: myResponse?.interest === interest ? null : interest,
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">
          {formatKickoff(game.date)}
        </span>
        <span
          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
            game.homeAway === "H"
              ? "bg-chelsea text-white"
              : "bg-slate-700 text-white"
          }`}
        >
          {game.homeAway === "H" ? "HOME" : "AWAY"}
        </span>
        {game.loyaltyPoints && (
          <span
            className="rounded bg-yellow-100 px-1.5 py-0.5 text-[10px] font-bold text-yellow-800"
            title="Sold on loyalty points"
          >
            ★ LOYALTY PTS
          </span>
        )}
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status.key]}`}
        >
          {status.label}
        </span>
      </div>

      <h3 className="mt-1.5 text-base font-bold text-slate-900">
        {game.opponent}
        <span className="ml-2 text-xs font-normal text-slate-400">
          {game.competition}
        </span>
      </h3>
      {game.notes && (
        <p className="mt-0.5 text-xs text-amber-700">{game.notes}</p>
      )}
      <p className="mt-1 text-xs text-slate-500">
        Apply window: {formatWindowPoint(game.orderOpen)} →{" "}
        {formatWindowPoint(game.orderClose)}
      </p>

      {/* Interest picker */}
      {currentMember && (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {INTEREST_ORDER.map((level) => {
            const selected = myResponse?.interest === level;
            return (
              <button
                key={level}
                onClick={() => setInterest(level)}
                className={`rounded-lg border px-1 py-2 text-xs font-semibold transition-colors ${
                  selected ? INTEREST_STYLES[level] : INTEREST_IDLE_STYLE
                }`}
              >
                {INTEREST_META[level].label}
              </button>
            );
          })}
        </div>
      )}

      {/* Everyone's answers at a glance */}
      {activeMembers.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {activeMembers.map((m) => {
            const r = getResponse(data, game.id, m.id);
            const style = r.interest
              ? INTEREST_STYLES[r.interest]
              : "bg-slate-100 text-slate-400 border-slate-200";
            const label = r.interest
              ? INTEREST_META[r.interest].label
              : "No answer yet";
            return (
              <span
                key={m.id}
                title={`${m.name}: ${label}${r.applied ? " · applied" : ""}`}
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold ${style} ${
                  r.applied ? "ring-2 ring-sky-400 ring-offset-1" : ""
                }`}
              >
                {initials(m.name)}
              </span>
            );
          })}
          {appliedMembers.length > 0 && (
            <span className="ml-1 text-[11px] font-medium text-sky-700">
              {appliedMembers.length} applied
              {successCount > 0 && ` · ${successCount} successful`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
