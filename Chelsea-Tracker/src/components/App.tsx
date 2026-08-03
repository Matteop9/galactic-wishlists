"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Action,
  AppData,
  Member,
  pendingCount,
  plannedCount,
  successCount,
} from "@/lib/types";
import { initials } from "@/lib/ui";
import Fixtures from "./Fixtures";
import Overview from "./Overview";
import Deadlines from "./Deadlines";
import Admin from "./Admin";

const MEMBER_KEY = "ct_member";

type Tab = "fixtures" | "overview" | "deadlines" | "settings";

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [persistent, setPersistent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>("fixtures");
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  // The picker is shown on every fresh visit — first thing you do is say who you are.
  const [pickerOpen, setPickerOpen] = useState(true);
  const [rememberedId, setRememberedId] = useState<string | null>(null);
  const loadedOnce = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/data", { cache: "no-store" });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const json = (await res.json()) as { data: AppData; persistent: boolean };
      setData(json.data);
      setPersistent(json.persistent);
      setError(null);
    } catch (e) {
      if (!loadedOnce.current) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    } finally {
      loadedOnce.current = true;
    }
  }, []);

  useEffect(() => {
    setRememberedId(localStorage.getItem(MEMBER_KEY));
    fetchData();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchData();
    }, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchData]);

  const patch = useCallback(async (action: Action): Promise<AppData> => {
    setSaving(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      const json = (await res.json()) as { data: AppData; persistent: boolean };
      setData(json.data);
      setPersistent(json.persistent);
      setError(null);
      return json.data;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      throw e;
    } finally {
      setSaving(false);
    }
  }, []);

  const pickMember = (id: string) => {
    setCurrentMemberId(id);
    localStorage.setItem(MEMBER_KEY, id);
    setRememberedId(id);
    setPickerOpen(false);
  };

  const currentMember: Member | null =
    (data && data.members.find((m) => m.id === currentMemberId)) || null;

  if (error && !data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-800">
            Couldn&apos;t load the tracker
          </p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => fetchData()}
            className="mt-4 rounded-lg bg-chelsea px-4 py-2 text-sm font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-chelsea border-t-transparent" />
          <p className="mt-3 text-sm font-medium text-slate-500">
            Loading fixtures…
          </p>
        </div>
      </div>
    );
  }

  const activeMembers = data.members.filter((m) => m.active);

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-chelsea text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold leading-tight sm:text-xl">
              Chelsea Tickets
            </h1>
            <p className="text-xs text-blue-200">
              Supporters Club · {data.settings.seasonLabel}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saving && (
              <span className="hidden text-xs text-blue-200 sm:inline">
                Saving…
              </span>
            )}
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-2 rounded-full bg-white/10 py-1.5 pl-1.5 pr-3 text-sm font-semibold hover:bg-white/20"
              title="Switch person"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-chelsea">
                {currentMember ? initials(currentMember.name) : "?"}
              </span>
              <span className="max-w-28 truncate">
                {currentMember ? currentMember.name.split(" ")[0] : "Who are you?"}
              </span>
            </button>
          </div>
        </div>
        {currentMember && (
          <div className="mx-auto max-w-5xl px-4 pb-2 text-xs text-blue-100">
            Tickets won: {successCount(data, currentMember.id)}/
            {data.settings.maxGamesPerSeason}
            {pendingCount(data, currentMember.id) > 0 &&
              ` · ${pendingCount(data, currentMember.id)} pending`}
            {" · "}
            <span
              className={
                plannedCount(data, currentMember.id) >
                data.settings.maxGamesPerSeason
                  ? "font-bold text-rose-300"
                  : undefined
              }
            >
              planning {plannedCount(data, currentMember.id)}
              {plannedCount(data, currentMember.id) >
                data.settings.maxGamesPerSeason && " ⚠ over limit"}
            </span>
          </div>
        )}
        {/* Tabs */}
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {(
            [
              ["fixtures", "Fixtures"],
              ["overview", "Everyone"],
              ["deadlines", "Deadlines"],
              ["settings", "Settings"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-t-lg px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${
                tab === key
                  ? "bg-slate-50 text-chelsea"
                  : "text-blue-100 hover:bg-white/10"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {!persistent && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900">
          Demo mode — no storage connected, changes will NOT be saved.
        </div>
      )}
      {error && data && (
        <div className="bg-rose-100 px-4 py-2 text-center text-xs font-medium text-rose-800">
          {error} — your last change may not have saved.{" "}
          <button className="underline" onClick={() => fetchData()}>
            Refresh
          </button>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-3 py-4 sm:px-4">
        {tab === "fixtures" && (
          <Fixtures data={data} currentMember={currentMember} patch={patch} />
        )}
        {tab === "overview" && (
          <Overview data={data} currentMember={currentMember} patch={patch} />
        )}
        {tab === "deadlines" && (
          <Deadlines data={data} currentMember={currentMember} />
        )}
        {tab === "settings" && (
          <Admin data={data} currentMember={currentMember} patch={patch} />
        )}
      </main>

      {/* Person picker overlay */}
      {pickerOpen && (
        <PersonPicker
          members={activeMembers}
          rememberedId={rememberedId}
          onPick={pickMember}
          onAddMember={async (name, membershipNumber) => {
            const newData = await patch({
              type: "addMember",
              name,
              membershipNumber,
            });
            const added = newData.members
              .filter((m) => m.name === name.trim())
              .pop();
            if (added) pickMember(added.id);
          }}
          onSkip={
            currentMember || activeMembers.length === 0
              ? () => setPickerOpen(false)
              : undefined
          }
        />
      )}
    </div>
  );
}

function PersonPicker({
  members,
  rememberedId,
  onPick,
  onAddMember,
  onSkip,
}: {
  members: Member[];
  rememberedId: string | null;
  onPick: (id: string) => void;
  onAddMember: (name: string, membershipNumber: string) => Promise<void>;
  onSkip?: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [busy, setBusy] = useState(false);

  const submitNew = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await onAddMember(name, num);
      setName("");
      setNum("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-chelsea-dark/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-center text-lg font-bold text-slate-900">
          Who are you?
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Pick yourself so your answers go against your name.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {members.length === 0 && !adding && (
            <p className="text-center text-sm text-slate-500">
              No members yet — add the first one below.
            </p>
          )}
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => onPick(m.id)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                m.id === rememberedId
                  ? "border-chelsea bg-blue-50 ring-1 ring-chelsea"
                  : "border-slate-200 hover:border-chelsea hover:bg-blue-50"
              }`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-chelsea text-sm font-bold text-white">
                {initials(m.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold text-slate-900">
                  {m.name}
                </span>
                {m.id === rememberedId && (
                  <span className="text-xs text-chelsea">
                    You picked this last time
                  </span>
                )}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 border-t border-slate-100 pt-3">
          {adding ? (
            <div className="flex flex-col gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                autoFocus
              />
              <input
                value={num}
                onChange={(e) => setNum(e.target.value)}
                placeholder="Membership number"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitNew}
                  disabled={busy || !name.trim()}
                  className="flex-1 rounded-lg bg-chelsea px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Adding…" : "Add & continue"}
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-500 hover:border-chelsea hover:text-chelsea"
            >
              + I&apos;m not on the list
            </button>
          )}
          {onSkip && (
            <button
              onClick={onSkip}
              className="mt-2 w-full text-center text-xs text-slate-400 underline"
            >
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
