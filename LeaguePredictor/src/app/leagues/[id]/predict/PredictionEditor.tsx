'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Crest from '@/components/Crest';
import { savePredictionAction } from './actions';
import type { ScorerPick } from '@/lib/types';

export type EditorCompetition = {
  id: number;
  name: string;
  flag: string;
  teams: { id: number; shortName: string; crest: string }[]; // in initial predicted order
  squad: { id: number; name: string; position: string | null; teamShortName: string }[];
  initialScorer: ScorerPick | null;
  hasSaved: boolean;
};

type CompState = {
  ranking: number[];
  scorer: ScorerPick | null;
  dirty: boolean;
  status: 'idle' | 'saving' | 'saved' | 'error';
  error?: string;
};

const AUTOSAVE_MS = 3000;

export default function PredictionEditor({
  leagueId,
  lockAt,
  competitions,
}: {
  leagueId: string;
  lockAt: string;
  competitions: EditorCompetition[];
}) {
  const [activeId, setActiveId] = useState(competitions[0]?.id);
  const [states, setStates] = useState<Record<number, CompState>>(() =>
    Object.fromEntries(
      competitions.map((c) => [
        c.id,
        {
          ranking: c.teams.map((t) => t.id),
          scorer: c.initialScorer,
          dirty: false,
          status: c.hasSaved ? 'saved' : 'idle',
        } satisfies CompState,
      ]),
    ),
  );

  const teamById = useMemo(() => {
    const map = new Map<number, { id: number; shortName: string; crest: string }>();
    for (const c of competitions) for (const t of c.teams) map.set(t.id, t);
    return map;
  }, [competitions]);

  const statesRef = useRef(states);
  statesRef.current = states;

  const saveComp = useCallback(
    async (compId: number) => {
      const s = statesRef.current[compId];
      if (!s) return;
      setStates((prev) => ({ ...prev, [compId]: { ...prev[compId], status: 'saving' } }));
      const result = await savePredictionAction(leagueId, compId, s.ranking, s.scorer);
      setStates((prev) => ({
        ...prev,
        [compId]: result.ok
          ? { ...prev[compId], dirty: false, status: 'saved', error: undefined }
          : { ...prev[compId], status: 'error', error: result.error },
      }));
    },
    [leagueId],
  );

  // debounce autosave for any dirty competition
  useEffect(() => {
    const dirtyIds = Object.entries(states)
      .filter(([, s]) => s.dirty && s.status !== 'saving')
      .map(([id]) => Number(id));
    if (dirtyIds.length === 0) return;
    const timer = setTimeout(() => {
      for (const id of dirtyIds) void saveComp(id);
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [states, saveComp]);

  const active = competitions.find((c) => c.id === activeId) ?? competitions[0];
  const activeState = states[active.id];

  const mutate = (compId: number, fn: (s: CompState) => Partial<CompState>) =>
    setStates((prev) => ({ ...prev, [compId]: { ...prev[compId], ...fn(prev[compId]), dirty: true } }));

  const move = (compId: number, from: number, to: number) => {
    if (to < 0) return;
    mutate(compId, (s) => {
      if (to >= s.ranking.length) return {};
      return { ranking: arrayMove(s.ranking, from, to) };
    });
  };

  const lockDate = new Date(lockAt);

  return (
    <div className="mt-6">
      <div className="mb-4 rounded-lg border border-close/30 bg-close/10 px-4 py-2 text-sm">
        Locks{' '}
        <strong>
          {lockDate.toLocaleString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </strong>{' '}
        — you can reorder and re-save as much as you like until then.
      </div>

      {competitions.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {competitions.map((c) => {
            const s = states[c.id];
            const done = s.status === 'saved' && !s.dirty && s.scorer;
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                  c.id === active.id
                    ? 'border-primary bg-primary/15 text-ink'
                    : 'border-border bg-surface text-muted hover:text-ink'
                }`}
              >
                {c.flag} {c.name} {done ? '✓' : ''}
              </button>
            );
          })}
        </div>
      )}

      <ScorerPicker
        key={active.id}
        comp={active}
        value={activeState.scorer}
        onChange={(scorer) => mutate(active.id, () => ({ scorer }))}
      />

      <SortableTable
        comp={active}
        ranking={activeState.ranking}
        teamById={teamById}
        onDragEnd={(from, to) => move(active.id, from, to)}
      />

      <div className="sticky bottom-3 mt-4 flex items-center gap-3 rounded-xl border border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => {
            for (const c of competitions) {
              const s = statesRef.current[c.id];
              if (s.dirty || s.status === 'idle') void saveComp(c.id);
            }
          }}
          disabled={!Object.values(states).some((s) => s.dirty || s.status === 'idle')}
          className="rounded-lg bg-primary px-5 py-2 font-display font-bold text-primary-ink hover:brightness-110 transition disabled:opacity-50"
        >
          Save
        </button>
        <SaveStatus states={states} competitions={competitions} />
      </div>
    </div>
  );
}

function SaveStatus({
  states,
  competitions,
}: {
  states: Record<number, CompState>;
  competitions: EditorCompetition[];
}) {
  const anySaving = Object.values(states).some((s) => s.status === 'saving');
  const anyDirty = Object.values(states).some((s) => s.dirty);
  const errors = competitions
    .filter((c) => states[c.id].status === 'error')
    .map((c) => `${c.name}: ${states[c.id].error}`);

  const neverSaved = Object.values(states).some((s) => s.status === 'idle' && !s.dirty);

  if (errors.length > 0) return <p className="text-sm text-off">{errors.join(' · ')}</p>;
  if (anySaving) return <p className="text-sm text-muted">Saving…</p>;
  if (anyDirty) return <p className="text-sm text-muted">Unsaved changes — autosaves in a few seconds</p>;
  if (neverSaved) return <p className="text-sm text-muted">Nothing saved yet — hit Save to lock in this order</p>;
  return <p className="text-sm text-spot">All changes saved ✓</p>;
}

function SortableTable({
  comp,
  ranking,
  teamById,
  onDragEnd,
}: {
  comp: EditorCompetition;
  ranking: number[];
  teamById: Map<number, { id: number; shortName: string; crest: string }>;
  onDragEnd: (from: number, to: number) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ranking.indexOf(Number(active.id));
    const to = ranking.indexOf(Number(over.id));
    if (from >= 0 && to >= 0) onDragEnd(from, to);
  }

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ranking} strategy={verticalListSortingStrategy}>
          <ol>
            {ranking.map((teamId, idx) => (
              <SortableRow
                key={teamId}
                teamId={teamId}
                index={idx}
                total={ranking.length}
                team={teamById.get(teamId)}
                onNudge={(dir) => onDragEnd(idx, idx + dir)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableRow({
  teamId,
  index,
  total,
  team,
  onNudge,
}: {
  teamId: number;
  index: number;
  total: number;
  team?: { shortName: string; crest: string };
  onNudge: (dir: -1 | 1) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: teamId,
  });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 border-b border-border/40 px-2 py-1.5 last:border-0 ${
        isDragging ? 'relative z-10 bg-surface-2 shadow-lg' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        aria-label={`Drag ${team?.shortName ?? 'team'}`}
        className="cursor-grab touch-none rounded p-1.5 text-muted hover:text-ink active:cursor-grabbing"
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <circle cx="6" cy="4" r="1.7" />
          <circle cx="14" cy="4" r="1.7" />
          <circle cx="6" cy="10" r="1.7" />
          <circle cx="14" cy="10" r="1.7" />
          <circle cx="6" cy="16" r="1.7" />
          <circle cx="14" cy="16" r="1.7" />
        </svg>
      </button>
      <span className="w-7 text-right font-num font-bold tabular text-muted">{index + 1}</span>
      <Crest src={team?.crest} alt="" size={20} />
      <span className="flex-1 truncate text-sm font-semibold">{team?.shortName ?? teamId}</span>
      <div className="flex gap-1">
        <button
          onClick={() => onNudge(-1)}
          disabled={index === 0}
          aria-label="Move up"
          className="rounded border border-border px-2 py-0.5 text-xs text-muted hover:text-ink disabled:opacity-30"
        >
          ▲
        </button>
        <button
          onClick={() => onNudge(1)}
          disabled={index === total - 1}
          aria-label="Move down"
          className="rounded border border-border px-2 py-0.5 text-xs text-muted hover:text-ink disabled:opacity-30"
        >
          ▼
        </button>
      </div>
    </li>
  );
}

function ScorerPicker({
  comp,
  value,
  onChange,
}: {
  comp: EditorCompetition;
  value: ScorerPick | null;
  onChange: (pick: ScorerPick | null) => void;
}) {
  const [query, setQuery] = useState(value?.playerName ?? '');
  const [open, setOpen] = useState(false);
  const [showGK, setShowGK] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return comp.squad
      .filter((p) => (showGK || p.position !== 'Goalkeeper') && p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [comp.squad, query, showGK]);

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <label className="block text-sm font-semibold">
        {comp.name} top scorer <span className="font-normal text-spot">(−5 if you call it)</span>
      </label>
      <div className="relative mt-2">
        <input
          value={query}
          onChange={(e) => {
            const text = e.target.value;
            setQuery(text);
            setOpen(true);
            onChange(text.trim() ? { playerName: text.trim() } : null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Start typing a player’s name…"
          className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        {open && matches.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-surface-2 shadow-xl">
            {matches.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setQuery(p.name);
                    setOpen(false);
                    onChange({ playerId: p.id, playerName: p.name });
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-primary/10"
                >
                  <span>{p.name}</span>
                  <span className="text-xs text-muted">{p.teamShortName}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>
          {value?.playerId
            ? `Picked from squads ✓`
            : value?.playerName
              ? 'Free-text pick — we’ll match it by name'
              : 'No pick yet'}
        </span>
        <label className="flex cursor-pointer items-center gap-1">
          <input type="checkbox" checked={showGK} onChange={(e) => setShowGK(e.target.checked)} />
          include keepers
        </label>
      </div>
    </div>
  );
}
