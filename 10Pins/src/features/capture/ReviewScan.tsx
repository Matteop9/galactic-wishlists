import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Scorecard, { type ScorecardPlayer } from '../../components/scorecard/Scorecard';
import GroupPicker from '../../components/GroupPicker';
import Icon from '../../components/Icon';
import Strip, { StripRow, StripTitle } from '../../components/Strip';
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
 * The photo is pinned above the extracted sheet. Flagged frames (filled with
 * card by the Scorecard) are the only friction: tap one, re-enter it, and
 * every later total re-derives. A sheet where nothing is flagged saves in one
 * tap.
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
  /** the extraction already mapped through the engine (flagged frames included) */
  players: ReviewPlayer[];
  initialGroupId: string | null;
  initialVenue: string | null;
  playedAt: string;
  onRetake: () => void;
  onConfirmed: (
    gameId: string,
    rows: Row[],
    verification: 'verified' | 'unverified',
    highlights: string[],
  ) => void;
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

  // Re-suggest identities whenever the candidate pool or the group’s
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
    name: row.displayedName,
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
      const saved = await saveScannedGame({
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
      return saved;
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries();
      onConfirmed(saved.gameId, rows, verification, saved.highlights);
    },
    onError: () => setError('That didn’t save. Your scan is still here, try again.'),
  });

  const editingRow = editing ? rows[editing.player] : null;
  const monitorTotals = rows.some((r) => r.finalScore !== null);

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      {/* The header is PageHeader's shape, hand-rolled because going back here
          must discard the upload, not just pop history. */}
      <header className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDiscard}
          aria-label="Back"
          className="press -ml-1.5 flex size-9 shrink-0 items-center justify-center text-ink"
        >
          <Icon name="chevron-left" className="size-[22px]" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="num truncate text-[22px] font-semibold leading-tight">Check the sheet</h1>
          {rows.length > 0 && (
            <p className="truncate text-[13px] text-ink-faded">
              {clean ? (
                'Every total adds up from the photo'
              ) : (
                <>
                  <span className="num">{amberCount}</span> {amberCount === 1 ? 'frame' : 'frames'} to check
                </>
              )}
            </p>
          )}
        </div>
      </header>

      <Strip soft>
        <StripRow
          onClick={() => setPhotoOpen((open) => !open)}
          right={<Icon name={photoOpen ? 'chevron-up' : 'chevron-down'} className="size-5 text-ink-faded" />}
        >
          <span className="label">Your photo</span>
        </StripRow>
        {photoOpen && (
          <div className="h-[140px] bg-card">
            {photo.data ? (
              <img src={photo.data} alt="The scoreboard you photographed" className="size-full object-contain" />
            ) : (
              <span className="grid size-full place-items-center text-[13px] text-ink-faded">Loading the photo</span>
            )}
          </div>
        )}
      </Strip>

      <div className="flex flex-col gap-3">
        <span className="label">
          Players{' '}
          <span className="optional">{groupId ? 'corrections are remembered for this group' : 'tap a name to correct it'}</span>
        </span>
        {rows.map((row, i) => (
          <div key={`${row.displayedName}-${i}`} className="flex flex-col gap-1">
            <span id={`scan-player-${i}`} className="text-[13px] text-ink-faded">
              {row.displayedName} on the sheet
            </span>
            <button
              type="button"
              aria-labelledby={`scan-player-${i}`}
              aria-expanded={pickerFor === i}
              onClick={() => setPickerFor(pickerFor === i ? null : i)}
              className="field press flex items-center justify-between gap-2 text-left"
            >
              <span className="truncate">
                {row.identity.kind === 'profile' ? identityLabel(row.identity) : 'Guest'}
                {row.identity.kind === 'profile' && row.identity.profileId === profile.id && (
                  <span className="ml-1.5 text-ink-faded">you</span>
                )}
                {row.identity.kind === 'guest' && (
                  <span className="ml-1.5 text-ink-faded">{identityLabel(row.identity)}</span>
                )}
              </span>
              <Icon name="chevron-down" className="size-5 shrink-0 text-ink-faded" />
            </button>
            {pickerFor === i && (
              <Strip className="sheet-up">
                <StripTitle
                  right={
                    <button type="button" onClick={() => setPickerFor(null)} className="press text-blue">
                      Close
                    </button>
                  }
                >
                  Who is {row.displayedName}?
                </StripTitle>
                {candidates.map((candidate) => (
                  <StripRow
                    key={candidate.profileId}
                    onClick={() =>
                      chooseIdentity(i, {
                        kind: 'profile',
                        profileId: candidate.profileId,
                        displayName: candidate.displayName,
                      })
                    }
                    right={
                      candidate.profileId === profile.id ? (
                        <span className="text-[12px] text-ink-faded">you</span>
                      ) : undefined
                    }
                  >
                    {candidate.displayName}
                  </StripRow>
                ))}
                <StripRow
                  onClick={() =>
                    chooseIdentity(i, {
                      kind: 'guest',
                      guestName: row.displayedName.trim() || 'Guest',
                    })
                  }
                  className="text-ink-faded"
                >
                  Guest · {row.displayedName}
                </StripRow>
              </Strip>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Scorecard
          players={cardPlayers}
          variant="editing"
          onFrameTap={(player, frame) => {
            setPickerFor(null);
            setEditing({ player, frame });
          }}
        />
        {!clean && !editing && (
          <p className="text-[13px] text-ink-faded">
            A shaded frame does not add up from the photo. Tap it to fix it. Totals recalculate as you go.
          </p>
        )}
        {clean && !editing && rows.length > 0 && (
          <p className="text-[13px] text-ink-faded">Every total recomputes from the photo. Tap a frame to change it.</p>
        )}
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

      {rows.length > 0 && (
        <Strip>
          <StripTitle right={monitorTotals ? 'Monitor total in grey' : undefined}>Totals</StripTitle>
          {rows.map((row, i) => (
            <StripRow
              key={`total-${i}`}
              right={
                <span className="flex items-baseline gap-2">
                  {row.finalScore !== null && (
                    <span className="num text-[13px] text-ink-faded">{row.finalScore}</span>
                  )}
                  <span className="num text-[18px] font-semibold">{totalOf(row.frames) || '–'}</span>
                </span>
              }
            >
              <span className="num text-[15px] font-semibold">{row.displayedName}</span>
            </StripRow>
          ))}
        </Strip>
      )}

      {!complete && rows.length > 0 && (
        <p className="text-[13px] text-ink-faded">
          This sheet is not a finished game. It will be saved as in progress and left out of averages until
          the rest is scored.
        </p>
      )}

      <div className="flex flex-col gap-4 border-t border-hairline pt-4">
        <GroupPicker profileId={profile.id} value={groupId} onChange={setGroupId} id="scan-group" />
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="scan-date" className="label">
              Date
            </label>
            <input
              id="scan-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="field num"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="scan-venue" className="label">
              Venue <span className="optional">optional</span>
            </label>
            <input
              id="scan-venue"
              type="text"
              list="scan-venues"
              value={venue}
              onChange={(event) => setVenue(event.target.value)}
              placeholder="Hollywood Bowl"
              className="field"
            />
            <datalist id="scan-venues">
              {(venues.data ?? []).map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => confirm.mutate()}
          disabled={confirm.isPending || rows.length === 0}
          className="btn-primary"
        >
          {confirm.isPending ? 'Saving' : 'Save game'}
        </button>
        <button type="button" onClick={onRetake} className="btn-secondary">
          Retake
        </button>
        {!clean && rows.length > 0 && (
          <p className="text-center text-[12px] text-ink-faded">
            You can save it as it is. It will be marked unverified.
          </p>
        )}
        {error && (
          <p className="text-center text-[13px] text-red" role="alert">
            {error}
          </p>
        )}
      </div>
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
