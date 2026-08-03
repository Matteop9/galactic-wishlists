"use client";

import { useMemo, useState } from "react";
import {
  AppData,
  Game,
  INTEREST_META,
  KEEN_INTERESTS,
  Member,
  Outcome,
  PatchFn,
  getResponse,
  pendingCount,
  plannedCount,
  successCount,
} from "@/lib/types";
import {
  formatKickoff,
  formatWindowPoint,
  groupDeadline,
  orderStatus,
  STATUS_STYLES,
} from "@/lib/format";
import { INTEREST_STYLES, OUTCOME_STYLES, initials } from "@/lib/ui";
import { buildEmailBody, buildEmailSubject, buildMailto } from "@/lib/email";

export default function Overview({
  data,
  currentMember,
  patch,
}: {
  data: AppData;
  currentMember: Member | null;
  patch: PatchFn;
}) {
  const [dialogGameId, setDialogGameId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [sortBy, setSortBy] = useState<"kickoff" | "deadline">("kickoff");

  const members = data.members.filter((m) => m.active);
  const todayISO = new Date().toISOString().slice(0, 10);
  const games = data.games
    .filter((g) => showPast || g.date >= todayISO)
    .sort((a, b) =>
      sortBy === "deadline"
        ? groupDeadline(a).localeCompare(groupDeadline(b))
        : a.date.localeCompare(b.date)
    );
  const pastCount = data.games.length - data.games.filter((g) => g.date >= todayISO).length;
  const dialogGame = data.games.find((g) => g.id === dialogGameId) ?? null;

  if (members.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-slate-400">
        No members yet — add them in Settings.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-600">Key:</span>
        {(Object.keys(INTEREST_META) as (keyof typeof INTEREST_META)[]).map(
          (k) => (
            <span key={k} className="flex items-center gap-1">
              <span
                className={`inline-block h-3 w-3 rounded-full border ${INTEREST_STYLES[k]}`}
              />
              {INTEREST_META[k].label}
            </span>
          )
        )}
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full border border-sky-400 ring-2 ring-sky-400 ring-offset-1" />
          Applied
        </span>
        <span className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1">
            Sort:
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "kickoff" | "deadline")
              }
              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-[11px]"
            >
              <option value="kickoff">Kickoff date</option>
              <option value="deadline">Deadline</option>
            </select>
          </label>
          {pastCount > 0 && (
            <button
              onClick={() => setShowPast((v) => !v)}
              className="underline"
            >
              {showPast ? "Hide" : "Show"} past games
            </button>
          )}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left text-xs font-semibold text-slate-600">
                Game
              </th>
              {members.map((m) => (
                <th
                  key={m.id}
                  className="px-1 py-2 text-center text-xs font-semibold text-slate-600"
                  title={m.name}
                >
                  {initials(m.name)}
                </th>
              ))}
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {games.map((game) => {
              const status = orderStatus(game);
              return (
                <tr
                  key={game.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-blue-50/40"
                >
                  <td className="sticky left-0 z-10 bg-white px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${
                          status.key === "open"
                            ? "bg-emerald-500"
                            : status.key === "closing"
                              ? "bg-amber-500"
                              : status.key === "upcoming"
                                ? "bg-slate-300"
                                : "bg-slate-400"
                        }`}
                        title={status.label}
                      />
                      <span className="font-semibold text-slate-800">
                        {game.opponent}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {game.homeAway}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {formatKickoff(game.date)}
                      {sortBy === "deadline" && (
                        <span className="block text-amber-700">
                          {game.homeAway === "A" ? "to Neil by " : "apply by "}
                          {formatWindowPoint(groupDeadline(game))}
                        </span>
                      )}
                    </div>
                  </td>
                  {members.map((m) => {
                    const r = getResponse(data, game.id, m.id);
                    const style = r.interest
                      ? INTEREST_STYLES[r.interest]
                      : "bg-slate-50 text-slate-300 border-slate-200";
                    return (
                      <td key={m.id} className="px-1 py-2 text-center">
                        <span
                          title={`${m.name}: ${
                            r.interest
                              ? INTEREST_META[r.interest].label
                              : "No answer"
                          }${r.applied ? " · applied" : ""}${
                            r.outcome === "success"
                              ? " · successful"
                              : r.outcome === "unsuccessful"
                                ? " · unsuccessful"
                                : ""
                          }`}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-bold ${style} ${
                            r.applied ? "ring-2 ring-sky-400" : ""
                          }`}
                        >
                          {r.outcome === "success"
                            ? "🎟"
                            : r.outcome === "unsuccessful"
                              ? "✗"
                              : r.interest
                                ? INTEREST_META[r.interest].symbol
                                : "–"}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => setDialogGameId(game.id)}
                      className="rounded-lg bg-chelsea px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-chelsea-dark"
                    >
                      Apply
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                Tickets won (max {data.settings.maxGamesPerSeason})
              </td>
              {members.map((m) => {
                const won = successCount(data, m.id);
                const pending = pendingCount(data, m.id);
                const atLimit = won >= data.settings.maxGamesPerSeason;
                return (
                  <td key={m.id} className="px-1 py-2 text-center">
                    <span
                      className={`text-xs font-bold ${
                        atLimit ? "text-rose-600" : "text-slate-700"
                      }`}
                      title={`${m.name}: ${won} successful, ${pending} pending`}
                    >
                      {won}/{data.settings.maxGamesPerSeason}
                    </span>
                    {pending > 0 && (
                      <span className="block text-[10px] text-sky-600">
                        +{pending} pending
                      </span>
                    )}
                  </td>
                );
              })}
              <td />
            </tr>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                Planning to go
                <span className="block text-[10px] font-normal text-slate-400">
                  won + pending + Definitely/Yes votes
                </span>
              </td>
              {members.map((m) => {
                const planned = plannedCount(data, m.id);
                const over = planned > data.settings.maxGamesPerSeason;
                return (
                  <td key={m.id} className="px-1 py-2 text-center">
                    <span
                      className={`text-xs font-bold ${
                        over ? "text-rose-600" : "text-slate-700"
                      }`}
                      title={`${m.name} is planning ${planned} game${
                        planned === 1 ? "" : "s"
                      }${over ? " — OVER the season limit!" : ""}`}
                    >
                      {planned}
                      {over && " ⚠"}
                    </span>
                  </td>
                );
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {dialogGame && (
        <ApplyDialog
          data={data}
          game={dialogGame}
          members={members}
          currentMember={currentMember}
          patch={patch}
          onClose={() => setDialogGameId(null)}
        />
      )}
    </div>
  );
}

function ApplyDialog({
  data,
  game,
  members,
  currentMember,
  patch,
  onClose,
}: {
  data: AppData;
  game: Game;
  members: Member[];
  currentMember: Member | null;
  patch: PatchFn;
  onClose: () => void;
}) {
  const status = orderStatus(game);
  // Pre-tick everyone who's keen (Definitely/Interested) and not already applied for.
  const [ticked, setTicked] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const m of members) {
      const r = getResponse(data, game.id, m.id);
      if (r.interest && KEEN_INTERESTS.includes(r.interest) && !r.applied) {
        s.add(m.id);
      }
    }
    return s;
  });
  const [applierId, setApplierId] = useState<string>(
    currentMember?.id ?? members[0]?.id ?? ""
  );
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const applier = members.find((m) => m.id === applierId) ?? null;
  const tickedMembers = members.filter((m) => ticked.has(m.id));

  const emailBody = useMemo(
    () =>
      buildEmailBody(
        data.settings,
        game,
        tickedMembers,
        applier?.name ?? "___"
      ),
    [data.settings, game, tickedMembers, applier]
  );

  const toggle = (id: string) => {
    setTicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const markApplied = () =>
    run(() =>
      patch({
        type: "setApplied",
        gameId: game.id,
        memberIds: [...ticked],
        applied: true,
      })
    );

  const setOutcome = (outcome: Outcome | null) =>
    run(() =>
      patch({
        type: "setOutcome",
        gameId: game.id,
        memberIds: [...ticked],
        outcome,
      })
    );

  const clearApplication = () =>
    run(() =>
      patch({
        type: "setApplied",
        gameId: game.id,
        memberIds: [...ticked],
        applied: false,
      })
    );

  const copyEmail = async () => {
    await navigator.clipboard.writeText(emailBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasRecipient = data.settings.email.to.trim().length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {game.opponent}{" "}
              <span className="text-sm font-normal text-slate-400">
                ({game.homeAway === "H" ? "Home" : "Away"})
              </span>
            </h3>
            <p className="text-xs text-slate-500">{formatKickoff(game.date)}</p>
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status.key]}`}
            >
              {status.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Member selection */}
        <div className="mt-4 flex flex-col gap-1">
          {members.map((m) => {
            const r = getResponse(data, game.id, m.id);
            return (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 hover:bg-slate-50"
              >
                <input
                  type="checkbox"
                  checked={ticked.has(m.id)}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4 accent-[#034694]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">
                    {m.name}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {r.interest
                      ? INTEREST_META[r.interest].label
                      : "No answer yet"}
                  </span>
                </span>
                {r.applied && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      OUTCOME_STYLES[r.outcome ?? "pending"]
                    }`}
                  >
                    {r.outcome === "success"
                      ? "Successful"
                      : r.outcome === "unsuccessful"
                        ? "Unsuccessful"
                        : "Applied"}
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {/* Email */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600">
              Application email ({tickedMembers.length} ticket
              {tickedMembers.length === 1 ? "" : "s"})
            </label>
            <select
              value={applierId}
              onChange={(e) => setApplierId(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
              title="Who is sending the email"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  From: {m.name.split(" ")[0]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            readOnly
            value={emailBody}
            rows={9}
            className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 font-mono text-xs text-slate-700"
          />
          {!hasRecipient && (
            <p className="mt-1 text-[11px] text-amber-700">
              No recipient email set — add it in Settings to enable the
              one-click email button.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={
              hasRecipient && tickedMembers.length > 0
                ? buildMailto(
                    data.settings,
                    game,
                    tickedMembers,
                    applier?.name ?? ""
                  )
                : undefined
            }
            onClick={(e) => {
              if (!hasRecipient || tickedMembers.length === 0)
                e.preventDefault();
            }}
            className={`rounded-lg px-3 py-2.5 text-center text-sm font-semibold ${
              hasRecipient && tickedMembers.length > 0
                ? "bg-chelsea text-white hover:bg-chelsea-dark"
                : "cursor-not-allowed bg-slate-200 text-slate-400"
            }`}
            title={buildEmailSubject(game)}
          >
            ✉ Open email draft
          </a>
          <button
            onClick={copyEmail}
            disabled={tickedMembers.length === 0}
            className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            {copied ? "Copied ✓" : "Copy email text"}
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Track the ticked people
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={markApplied}
              disabled={busy || ticked.size === 0}
              className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Mark applied
            </button>
            <button
              onClick={() => setOutcome("success")}
              disabled={busy || ticked.size === 0}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Successful 🎟
            </button>
            <button
              onClick={() => setOutcome("unsuccessful")}
              disabled={busy || ticked.size === 0}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              Unsuccessful
            </button>
            <button
              onClick={clearApplication}
              disabled={busy || ticked.size === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              Clear application
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Tick people above, then use these to record who has been applied
            for and how it went.
          </p>
        </div>
      </div>
    </div>
  );
}
