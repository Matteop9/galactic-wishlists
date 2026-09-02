import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Scorecard, { type ScorecardPlayer } from '../../components/scorecard/Scorecard';
import GroupPicker from '../../components/GroupPicker';
import SpotFrameEditor from './SpotFrameEditor';
import { score, type FrameInput } from '../../engine';
import {
  badFramesFor,
  fetchNameMappings,
  isCleanScan,
  isCompleteScan,
  matchDisplayedName,
  rememberNameMapping,
  saveScannedGame,
  signedPhotoUrl,
  verificationFor,
  type Identity,
  type MatchCandidate,
  type ReviewPlayer,
  type ScanResult,
} from '../../lib/capture';
import { fetchVenueNames } from '../../lib/games';
import { fetchGroup } from '../../lib/groups';
import { fetchFriendships, otherProfile } from '../../lib/friends';
import type { Profile } from '../../lib/auth';

interface Row extends ReviewPlayer {
  identity: Identity;
  /** the identity we suggested, so we only remember genuine corrections */
  suggested: Identity;
}

function identityLabel(identity: Identity): string {
  return identity.kind === 'profile' ? identity.displayName : identity.guestName;
}

function sameIdentity(a: Identity, b: Identity): boolean {
  if (a.kind !== b.kind) return false;
  return a.kind === 'profile' && b.kind === 'profile'
    ? a.profileId === b.profileId
    : identityLabel(a) === identityLabel(b);
}

/**
 * Review & confirm (design §5.3c) — the make-or-break screen.
 *
 * The photo is pinned above the extracted card. Amber frames are the only
 * friction: tap one, re-enter it, and every later total re-derives. A card
 * where nothing is amber collapses to a single Confirm.
 */
export default function ReviewScan({
  profile,
  photoPath,
  result,
  players,
  initialGroupId,
  initialVenue,
  playedAt,
  onRetake,
  onConfirmed,
  onDiscard,
}: {
  profile: Profile;
  photoPath: string;
  result: ScanResult;
  /** the extraction already mapped through the engine (amber frames included) */
  players: ReviewPlayer[];
  initialGroupId: string | null;
  initialVenue: string | null;
  playedAt: string;
  onRetake: () => void;
  onConfirmed: (gameId: string, rows: Row[], verification: 'verified' | 'unverified') => void;
  onDiscard: () => void;
}) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [groupId, setGroupId] = useState<string | null>(initialGroupId);
  const [venue, setVenue] = useState(initialVenue ?? '');
  const [date, setDate] = useState(playedAt.slice(0, 10));
  const [photoOpen, setPhotoOpen] = useState(true);
  const [editing, setEditing] = useState<{ player: number; frame: number } | null>(null);
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [error, setError] = useState('');

  const photo = useQuery({
    queryKey: ['scan-photo', photoPath],
    queryFn: () => signedPhotoUrl(photoPath),
    staleTime: 10 * 60 * 1000,
  });
  const venues = useQuery({ queryKey: ['venues'], queryFn: fetchVenueNames });
  const friends = useQuery({
    queryKey: ['friendships', profile.id],
    queryFn: () => fetchFriendships(profile.id),
  });
  const group = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => fetchGroup(groupId!),
    enabled: !!groupId,
  });
  const mappings = useQuery({
    queryKey: ['name-mappings', groupId],
    queryFn: () => fetchNameMappings(groupId!),
    enabled: !!groupId,
  });

  const candidates: MatchCandidate[] = useMemo(() => {
    const all: MatchCandidate[] = [
      { profileId: profile.id, displayName: profile.display_name },
      ...(group.data?.group_members ?? []).map((m) => ({
        profileId: m.profile_id,
        displayName: m.profiles?.display_name ?? 'Player',
      })),
      ...(friends.data ?? [])
        .filter((f) => f.status === 'accepted')
        .map((f) => otherProfile(f, profile.id))
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => ({ profileId: p.id, displayName: p.display_name })),
    ];
    return all.filter((c, i) => all.findIndex((x) => x.profileId === c.profileId) === i);
  }, [profile.id, profile.display_name, group.data, friends.data]);

  // Re-suggest identities whenever the candidate pool or the group's
  // remembered corrections change — but never overwrite a manual choice.
  useEffect(() => {
    setRows((current) => {
      const base: ReviewPlayer[] = current.length ? current : players;
      return base.map((player, i) => {
        const existing = current[i];
        const suggested = matchDisplayedName(player.displayedName, candidates, mappings.data);
        const keepManual = existing && !sameIdentity(existing.identity, existing.suggested);
        return {
          ...player,
          identity: keepManual ? existing.identity : suggested,
          suggested,
        };
      });
    });
  }, [players, candidates, mappings.data]);

  const clean = rows.length > 0 && isCleanScan(rows);
  const complete = rows.length > 0 && isCompleteScan(rows);
  const verification = verificationFor(rows);
  const amberCount = rows.reduce((n, r) => n + r.badFrames.length, 0);

  const cardPlayers: ScorecardPlayer[] = rows.map((row) => ({
    name: row.displayedName.toUpperCase(),
    frames: row.frames,
    amberFrames: row.badFrames,
    current: false,
  }));

  function setFrames(playerIndex: number, frames: FrameInput[]) {
    setRows((current) =>
      current.map((row, i) =>
        i === playerIndex ? { ...row, frames, badFrames: badFramesFor(frames, row.claimed) } : row,
      ),
    );
  }

  function chooseIdentity(playerIndex: number, identity: Identity) {
    setRows((current) => current.map((row, i) => (i === playerIndex ? { ...row, identity } : row)));
    setPickerFor(null);
  }

  const confirm = useMutation({
    mutationFn: async () => {
      const gameId = await saveScannedGame({
        profileId: profile.id,
        photoPath,
        extraction: { ...result, reviewed_at: new Date().toISOString() },
        verification,
        complete,
        players: rows.map((row) => ({ identity: row.identity, frames: row.frames })),
        playedAt: new Date(`${date}T20:00:00`).toISOString(),
        venueName: venue,
        target: { groupId },
      });

      // Remember only the corrections, and only where a group can own them.
      if (groupId) {
        for (const row of rows) {
          if (!sameIdentity(row.identity, row.suggested)) {
            await rememberNameMapping(groupId, row.displayedName, row.identity).catch(() => undefined);
          }
        }
      }
      return gameId;
    },
    onSuccess: (gameId) => {
      queryClient.invalidateQueries();
      onConfirmed(gameId, rows, verification);
    },
    onError: () => setError("That didn't save — your scan is still here, try again."),
  });

  const editingRow = editing ? rows[editing.player] : null;

  return (
    <div className="flex flex-col gap-3 px-4 py-5">
      <header className="flex items-center gap-3">
        <button type="button" onClick={onDiscard} aria-label="Back" className="text-[22px] leading-none text-dim">
          ‹
        </button>
        <h1 className="font-display text-[17px] font-bold">
          {clean ? 'Looks right?' : 'Check the scorecard'}
        </h1>
        <button
          type="button"
          onClick={onRetake}
          className="press ml-auto text-[13px] font-bold text-phosphor"
        >
          Retake
        </button>
      </header>

      {photoOpen ? (
        <button
          type="button"
          onClick={() => setPhotoOpen(false)}
          className="press relative h-[110px] overflow-hidden rounded-xl border border-line bg-well"
        >
          {photo.data ? (
            <img src={photo.data} alt="The scoreboard you photographed" className="size-full object-contain" />
          ) : (
            <span className="label-caps absolute inset-0 grid place-items-center">Your photo</span>
          )}
          <span className="label-caps absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-center">
            Tap to collapse
          </span>
        </button>
      ) : (
        <button type="button" onClick={() => setPhotoOpen(true)} className="press self-start">
          <span className="label-caps">Photo ⌄</span>
        </button>
      )}

      <div className="flex flex-col gap-2">
        <span className="label-caps">
          {groupId ? 'Players · tap to correct · remembered for this group' : 'Players · tap to correct'}
        </span>
        <div className="flex flex-wrap gap-2">
          {rows.map((row, i) => (
            <button
              key={`${row.displayedName}-${i}`}
              type="button"
              onClick={() => setPickerFor(i)}
              className={`press flex min-w-[104px] flex-1 items-center gap-2 rounded-[10px] border px-2 py-1.5 text-left ${
                row.identity.kind === 'profile' ? 'border-line bg-panel' : 'border-dashed border-line'
              }`}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line bg-well font-display text-[10px] font-bold text-glass">
                {initialsOf(identityLabel(row.identity))}
              </span>
              <span className="min-w-0">
                <span className="label-caps block">{row.displayedName}</span>
                <span
                  className={`block truncate text-[11px] font-bold ${
                    row.identity.kind === 'profile' ? 'text-text' : 'text-dim'
                  }`}
                >
                  {row.identity.kind === 'profile' ? identityLabel(row.identity) : 'Guest'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {pickerFor !== null && (
        <div className="sheet-up flex flex-col gap-2 rounded-2xl border border-line bg-panel p-3">
          <div className="flex items-center">
            <span className="label-caps">Who is “{rows[pickerFor].displayedName}”?</span>
            <button
              type="button"
              onClick={() => setPickerFor(null)}
              className="ml-auto text-[13px] text-dim"
            >
              Close
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {candidates.map((candidate) => (
              <button
                key={candidate.profileId}
                type="button"
                onClick={() =>
                  chooseIdentity(pickerFor, {
                    kind: 'profile',
                    profileId: candidate.profileId,
                    displayName: candidate.displayName,
                  })
                }
                className="press rounded-xl border border-line bg-well px-3 py-2.5 text-left text-[13.5px] text-text"
              >
                {candidate.displayName}
                {candidate.profileId === profile.id && <span className="ml-2 text-[11px] text-dim">you</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                chooseIdentity(pickerFor, {
                  kind: 'guest',
                  guestName: rows[pickerFor].displayedName.trim() || 'Guest',
                })
              }
              className="press rounded-xl border border-dashed border-line px-3 py-2.5 text-left text-[13.5px] text-dim"
            >
              Guest · {rows[pickerFor].displayedName}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {rows.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="label-caps">
              {clean ? `All ${rows.length * 10} frames recompute ✓` : `${amberCount} frame${amberCount === 1 ? '' : 's'} to check`}
            </span>
            {rows.some((r) => r.finalScore !== null) && (
              <span className="label-caps">Monitor · {rows.map((r) => r.finalScore ?? '–').join(' / ')}</span>
            )}
          </div>
        )}
        <Scorecard
          players={cardPlayers}
          variant="editing"
          onFrameTap={(player, frame) => {
            setPickerFor(null);
            setEditing({ player, frame });
          }}
        />
        {rows.map((row, i) => (
          <div key={`total-${i}`} className="flex items-baseline justify-between">
            <span className="label-caps">{row.displayedName}</span>
            <span className="score-text text-[15px] font-semibold text-text">
              {totalOf(row.frames)}
            </span>
          </div>
        ))}
      </div>

      {editing && editingRow && (
        <SpotFrameEditor
          frames={editingRow.frames}
          frameIndex={editing.frame}
          playerName={editingRow.displayedName}
          onChange={(frames) => setFrames(editing.player, frames)}
          onDone={() => setEditing(null)}
        />
      )}

      {!clean && !editing && (
        <div className="flex items-center gap-2 rounded-[10px] border border-phosphor/35 bg-phosphor/10 px-3 py-2.5">
          <span className="size-2 shrink-0 rounded-full bg-phosphor shadow-glow-amber" />
          <p className="text-[12.5px] leading-snug text-text">
            {firstAmberSentence(rows)} Totals recalculate as you go.
          </p>
        </div>
      )}

      {clean && !editing && (
        <div className="flex flex-col items-center gap-1 pt-1">
          <p className="font-display text-[18px] font-bold">Everything adds up</p>
          <p className="text-[12.5px] text-dim">Nice scan. One tap and it’s on the board.</p>
        </div>
      )}

      {!complete && rows.length > 0 && (
        <p className="text-[12px] text-dim">
          This card isn’t a finished game — it’ll be saved as in progress and left out of averages until
          the rest is scored.
        </p>
      )}

      <div className="flex flex-col gap-3 border-t border-hairline pt-3">
        <GroupPicker profileId={profile.id} value={groupId} onChange={setGroupId} />
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="scan-date" className="label-caps">
              Date
            </label>
            <input
              id="scan-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-[10px] border border-line bg-well px-3 py-2.5 text-[13.5px] text-text"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="scan-venue" className="label-caps">
              Venue (optional)
            </label>
            <input
              id="scan-venue"
              list="scan-venues"
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              placeholder="Hollywood Bowl…"
              className="rounded-[10px] border border-line bg-well px-3 py-2.5 text-[13.5px] text-text placeholder:text-faint"
            />
            <datalist id="scan-venues">
              {(venues.data ?? []).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => confirm.mutate()}
        disabled={confirm.isPending || rows.length === 0}
        className="press rounded-xl bg-phosphor py-3.5 font-display text-[15px] font-bold tracking-[.04em] text-ink shadow-glow-amber disabled:bg-disabled disabled:text-faint disabled:shadow-none"
      >
        {confirm.isPending ? 'Posting…' : 'Confirm scorecard'}
      </button>
      {!clean && (
        <p className="text-center text-[12px] text-faint">
          You can post it as it is — it just won’t be verified.
        </p>
      )}
      {clean && (
        <p className="text-center text-[12px] text-faint">Something’s off? Tap a frame to edit it</p>
      )}
      {error && (
        <p className="text-center text-[13px] text-signal" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function totalOf(frames: FrameInput[]): string {
  try {
    const scored = score(frames);
    const running = [...scored.frames].reverse().find((f) => f.cumulative !== null)?.cumulative;
    return running == null ? '' : String(running);
  } catch {
    return '';
  }
}

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function firstAmberSentence(rows: Row[]): string {
  for (const row of rows) {
    if (row.badFrames.length > 0) {
      const frame = row.badFrames[0] + 1;
      const extra = row.badFrames.length > 1 ? ` (and ${row.badFrames.length - 1} more)` : '';
      return `Frame ${frame} of ${row.displayedName}’s doesn’t add up${extra} — tap it to fix.`;
    }
  }
  return '';
}
