"use client";

import { useState } from "react";
import {
  AppData,
  Game,
  HomeAway,
  Member,
  PatchFn,
} from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { DEFAULT_TEMPLATE } from "@/lib/seed";

export default function Admin({
  data,
  currentMember,
  patch,
}: {
  data: AppData;
  currentMember: Member | null;
  patch: PatchFn;
}) {
  return (
    <div className="flex flex-col gap-4">
      <FeedbackSection data={data} currentMember={currentMember} patch={patch} />
      <MembersSection data={data} patch={patch} />
      <GamesSection data={data} patch={patch} />
      <SettingsSection data={data} patch={patch} />
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold text-slate-800">
            {title}
          </span>
          {subtitle && (
            <span className="block text-xs text-slate-400">{subtitle}</span>
          )}
        </span>
        <span className="text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="border-t border-slate-100 p-4">{children}</div>}
    </section>
  );
}

/* ---------------- Feedback ---------------- */

function FeedbackSection({
  data,
  currentMember,
  patch,
}: {
  data: AppData;
  currentMember: Member | null;
  patch: PatchFn;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await patch({
        type: "addFeedback",
        authorName: currentMember?.name ?? "Anonymous",
        text,
      });
      setText("");
      setSent(true);
      setTimeout(() => setSent(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  const open = data.feedback.filter((f) => !f.resolved);
  const resolved = data.feedback.filter((f) => f.resolved);

  return (
    <Section
      title="Feedback & ideas"
      subtitle="Spotted a bug or want a feature? Leave a note here."
      defaultOpen
    >
      <div className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. Can we get cup games added? The Liverpool deadline looks wrong…"
          className="w-full rounded-lg border border-slate-300 p-2.5 text-sm"
        />
        <button
          onClick={submit}
          disabled={busy || !text.trim()}
          className="self-start rounded-lg bg-chelsea px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {sent ? "Sent ✓" : busy ? "Sending…" : "Send feedback"}
        </button>
      </div>

      {(open.length > 0 || resolved.length > 0) && (
        <div className="mt-4 flex flex-col gap-2">
          {open.map((f) => (
            <FeedbackRow key={f.id} f={f} patch={patch} />
          ))}
          {resolved.length > 0 && (
            <details className="mt-1">
              <summary className="cursor-pointer text-xs text-slate-400">
                {resolved.length} resolved
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {resolved.map((f) => (
                  <FeedbackRow key={f.id} f={f} patch={patch} />
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </Section>
  );
}

function FeedbackRow({
  f,
  patch,
}: {
  f: AppData["feedback"][number];
  patch: PatchFn;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        f.resolved
          ? "border-slate-100 bg-slate-50 opacity-70"
          : "border-slate-200"
      }`}
    >
      <p className="text-sm text-slate-800">{f.text}</p>
      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-400">
        <span>
          {f.authorName} ·{" "}
          {new Date(f.createdAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
          })}
        </span>
        <button
          onClick={() =>
            patch({
              type: "setFeedbackResolved",
              feedbackId: f.id,
              resolved: !f.resolved,
            })
          }
          className="underline"
        >
          {f.resolved ? "Reopen" : "Mark resolved"}
        </button>
        <button
          onClick={() => {
            if (confirm("Delete this feedback?"))
              patch({ type: "deleteFeedback", feedbackId: f.id });
          }}
          className="text-rose-500 underline"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

/* ---------------- Members ---------------- */

function MembersSection({ data, patch }: { data: AppData; patch: PatchFn }) {
  const [name, setName] = useState("");
  const [num, setNum] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await patch({ type: "addMember", name, membershipNumber: num });
      setName("");
      setNum("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Members"
      subtitle={`${data.members.filter((m) => m.active).length} active`}
    >
      <div className="flex flex-col gap-2">
        {data.members.map((m) =>
          editingId === m.id ? (
            <MemberForm
              key={m.id}
              member={m}
              onSave={async (updated) => {
                await patch({ type: "updateMember", member: updated });
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div
              key={m.id}
              className={`flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 ${
                m.active ? "" : "opacity-50"
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {m.name}
                  {!m.active && (
                    <span className="ml-2 text-[10px] font-normal text-slate-400">
                      inactive
                    </span>
                  )}
                </span>
                <span className="text-xs text-slate-400">
                  #{m.membershipNumber || "no number"}
                </span>
              </span>
              <button
                onClick={() => setEditingId(m.id)}
                className="text-xs font-medium text-chelsea underline"
              >
                Edit
              </button>
            </div>
          )
        )}
      </div>
      <div className="mt-3 flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={num}
          onChange={(e) => setNum(e.target.value)}
          placeholder="Membership number"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          onClick={add}
          disabled={busy || !name.trim()}
          className="rounded-lg bg-chelsea px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </Section>
  );
}

function MemberForm({
  member,
  onSave,
  onCancel,
}: {
  member: Member;
  onSave: (m: Member) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Member>({ ...member });
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-chelsea/30 bg-blue-50/50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Full name"
        />
        <input
          value={draft.membershipNumber}
          onChange={(e) =>
            setDraft({ ...draft, membershipNumber: e.target.value })
          }
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
          placeholder="Membership number"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
          className="h-4 w-4 accent-[#034694]"
        />
        Active (shows in pickers and the grid)
      </label>
      <div className="flex gap-2">
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(draft);
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy || !draft.name.trim()}
          className="rounded-lg bg-chelsea px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ---------------- Games ---------------- */

const EMPTY_GAME: Omit<Game, "id"> = {
  date: "",
  opponent: "",
  competition: "Premier League",
  homeAway: "H",
  orderOpen: "",
  orderClose: "",
  loyaltyPoints: false,
  notes: "",
};

function GamesSection({ data, patch }: { data: AppData; patch: PatchFn }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);

  return (
    <Section
      title="Games & deadlines"
      subtitle="Deadlines are subject to change — edit any game individually"
    >
      <button
        onClick={() => {
          setAddingNew(true);
          setEditingId(null);
        }}
        className="mb-3 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:border-chelsea hover:text-chelsea"
      >
        + Add game (cup ties, rearranged fixtures…)
      </button>
      {addingNew && (
        <div className="mb-3">
          <GameForm
            initial={EMPTY_GAME}
            onSave={async (game) => {
              await patch({ type: "addGame", game });
              setAddingNew(false);
            }}
            onCancel={() => setAddingNew(false)}
          />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        {data.games.map((game) =>
          editingId === game.id ? (
            <GameForm
              key={game.id}
              initial={game}
              onSave={async (updated) => {
                await patch({
                  type: "updateGame",
                  game: { ...updated, id: game.id },
                });
                setEditingId(null);
              }}
              onCancel={() => setEditingId(null)}
              onDelete={async () => {
                if (
                  confirm(
                    `Delete ${game.opponent} (${formatKickoff(game.date)})? This removes everyone's answers for it.`
                  )
                ) {
                  await patch({ type: "deleteGame", gameId: game.id });
                  setEditingId(null);
                }
              }}
            />
          ) : (
            <div
              key={game.id}
              className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-2"
            >
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
                  game.homeAway === "H" ? "bg-chelsea" : "bg-slate-600"
                }`}
              >
                {game.homeAway}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {game.opponent}
                  {game.loyaltyPoints && (
                    <span className="ml-1 text-yellow-600">★</span>
                  )}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatKickoff(game.date)} · window{" "}
                  {game.orderOpen.replace("T", " ")} →{" "}
                  {game.orderClose.replace("T", " ")}
                </span>
              </span>
              <button
                onClick={() => {
                  setEditingId(game.id);
                  setAddingNew(false);
                }}
                className="text-xs font-medium text-chelsea underline"
              >
                Edit
              </button>
            </div>
          )
        )}
      </div>
    </Section>
  );
}

function GameForm({
  initial,
  onSave,
  onCancel,
  onDelete,
}: {
  initial: Omit<Game, "id"> | Game;
  onSave: (g: Omit<Game, "id">) => Promise<void>;
  onCancel: () => void;
  onDelete?: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Omit<Game, "id">>({ ...initial });
  const [busy, setBusy] = useState(false);
  const valid =
    draft.opponent.trim() && draft.date && draft.orderOpen && draft.orderClose;

  const field = (label: string, node: React.ReactNode) => (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
      {label}
      {node}
    </label>
  );
  const inputCls = "rounded-lg border border-slate-300 px-2.5 py-2 text-sm text-slate-800";

  return (
    <div className="rounded-lg border border-chelsea/30 bg-blue-50/50 p-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {field(
          "Opponent",
          <input
            value={draft.opponent}
            onChange={(e) => setDraft({ ...draft, opponent: e.target.value })}
            className={inputCls}
            placeholder="e.g. Liverpool"
          />
        )}
        {field(
          "Competition",
          <input
            value={draft.competition}
            onChange={(e) =>
              setDraft({ ...draft, competition: e.target.value })
            }
            className={inputCls}
            placeholder="Premier League / FA Cup…"
          />
        )}
        {field(
          "Kickoff date",
          <input
            type="date"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            className={inputCls}
          />
        )}
        {field(
          "Home / Away",
          <select
            value={draft.homeAway}
            onChange={(e) =>
              setDraft({ ...draft, homeAway: e.target.value as HomeAway })
            }
            className={inputCls}
          >
            <option value="H">Home</option>
            <option value="A">Away</option>
          </select>
        )}
        {field(
          "Applications open",
          <input
            type="datetime-local"
            value={draft.orderOpen}
            onChange={(e) => setDraft({ ...draft, orderOpen: e.target.value })}
            className={inputCls}
          />
        )}
        {field(
          "Applications close",
          <input
            type="datetime-local"
            value={draft.orderClose}
            onChange={(e) => setDraft({ ...draft, orderClose: e.target.value })}
            className={inputCls}
          />
        )}
      </div>
      <label className="mt-2.5 flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={draft.loyaltyPoints}
          onChange={(e) =>
            setDraft({ ...draft, loyaltyPoints: e.target.checked })
          }
          className="h-4 w-4 accent-[#034694]"
        />
        Sold on loyalty points (★)
      </label>
      <div className="mt-2.5">
        <input
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          className={`${inputCls} w-full`}
          placeholder="Notes (e.g. Platinum clubs only)"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={async () => {
            setBusy(true);
            try {
              await onSave(draft);
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy || !valid}
          className="rounded-lg bg-chelsea px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          Cancel
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            className="ml-auto rounded-lg border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50"
          >
            Delete game
          </button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */

function SettingsSection({ data, patch }: { data: AppData; patch: PatchFn }) {
  const [draft, setDraft] = useState({ ...data.settings, email: { ...data.settings.email } });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newSeason, setNewSeason] = useState("");

  const save = async () => {
    setBusy(true);
    try {
      await patch({ type: "updateSettings", settings: draft });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setBusy(false);
    }
  };

  const inputCls =
    "rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 w-full";

  return (
    <Section title="Season settings" subtitle="Email template, limits, new season">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Season label
          <input
            value={draft.seasonLabel}
            onChange={(e) =>
              setDraft({ ...draft, seasonLabel: e.target.value })
            }
            className={inputCls}
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Max games per member per season
          <input
            type="number"
            min={1}
            value={draft.maxGamesPerSeason}
            onChange={(e) =>
              setDraft({
                ...draft,
                maxGamesPerSeason: Math.max(1, Number(e.target.value) || 1),
              })
            }
            className={inputCls}
          />
        </label>
      </div>
      <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-slate-500">
        Application email — send to (Neil&apos;s email)
        <input
          type="email"
          value={draft.email.to}
          onChange={(e) =>
            setDraft({ ...draft, email: { ...draft.email, to: e.target.value } })
          }
          className={inputCls}
          placeholder="neil@example.com"
        />
      </label>
      <label className="mt-3 flex flex-col gap-1 text-xs font-medium text-slate-500">
        Email template
        <textarea
          value={draft.email.template}
          onChange={(e) =>
            setDraft({
              ...draft,
              email: { ...draft.email, template: e.target.value },
            })
          }
          rows={10}
          className={`${inputCls} font-mono text-xs`}
        />
        <span className="text-[11px] font-normal text-slate-400">
          Placeholders: {"{count}"} tickets · {"{opponent}"} · {"{date}"} ·{" "}
          {"{members}"} (one “Name - number” per line) · {"{applier}"} (first
          name).{" "}
          <button
            className="underline"
            onClick={() =>
              setDraft({
                ...draft,
                email: { ...draft.email, template: DEFAULT_TEMPLATE },
              })
            }
          >
            Reset to default
          </button>
        </span>
      </label>
      <button
        onClick={save}
        disabled={busy}
        className="mt-3 rounded-lg bg-chelsea px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
      >
        {saved ? "Saved ✓" : busy ? "Saving…" : "Save settings"}
      </button>

      <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 p-3">
        <p className="text-sm font-bold text-rose-800">Start a new season</p>
        <p className="mt-0.5 text-xs text-rose-600">
          Deletes ALL games and everyone&apos;s answers. Members and settings
          are kept. You can&apos;t undo this.
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            value={newSeason}
            onChange={(e) => setNewSeason(e.target.value)}
            placeholder="New season label, e.g. 2027-28"
            className="flex-1 rounded-lg border border-rose-300 px-3 py-2 text-sm"
          />
          <button
            onClick={async () => {
              if (!newSeason.trim()) return;
              if (
                confirm(
                  `Start season "${newSeason.trim()}"? All games and answers will be permanently deleted.`
                )
              ) {
                await patch({
                  type: "resetSeason",
                  seasonLabel: newSeason.trim(),
                });
                setNewSeason("");
              }
            }}
            disabled={!newSeason.trim()}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Reset for new season
          </button>
        </div>
      </div>
    </Section>
  );
}
