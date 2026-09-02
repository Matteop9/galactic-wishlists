import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReviewScan from './ReviewScan';
import {
  compressPhoto,
  deleteScanPhoto,
  runExtraction,
  toReviewPlayers,
  uploadScan,
  ScanError,
  type ReviewPlayer,
  type ScanErrorCode,
  type ScanResult,
} from '../../lib/capture';
import { enqueueScan, getQueuedScan, removeQueuedScan } from '../../lib/scanQueue';
import { gameCelebration } from '../../lib/celebrate';
import { celebrate } from '../../lib/celebrationStore';
import { score } from '../../engine';
import type { Profile } from '../../lib/auth';

type Phase = 'camera' | 'processing' | 'review' | 'error' | 'queued' | 'done';

interface Loaded {
  photoPath: string;
  result: ScanResult;
  players: ReviewPlayer[];
}

const ERROR_COPY: Record<ScanErrorCode, { title: string; body: string }> = {
  unreadable: {
    title: "Couldn’t read that one",
    body: 'Fill the frame with the score grid and keep glare off it — or enter the frames yourself.',
  },
  daily_cap: {
    title: "That’s today’s scans used up",
    body: 'Scanning resets 24 hours after your first one. You can still score live or enter frames yourself.',
  },
  model_failed: {
    title: 'The reader had a moment',
    body: 'Nothing wrong with your photo. Try again in a minute, or enter the frames yourself.',
  },
  model_unreachable: {
    title: "Couldn’t reach the reader",
    body: 'Your photo is safe. Try again when you have signal.',
  },
  photo_missing: {
    title: 'That photo went missing',
    body: 'Take it again — it only takes a second.',
  },
  not_configured: {
    title: 'Scanning is off right now',
    body: 'Score live or enter the frames yourself in the meantime.',
  },
  scanning_paused: {
    title: 'Scanning is paused',
    body: 'Score live or enter the frames yourself in the meantime.',
  },
  offline: {
    title: 'No signal',
    body: "We’ll scan this when you’re back online.",
  },
  unknown: {
    title: 'That scan did not finish',
    body: 'Try again, or enter the frames yourself.',
  },
};

/**
 * The capture flow (design §5.3): camera → processing → review → confirmed,
 * with offline as a first-class path rather than an error. One route holds all
 * four so an extraction is never lost to a navigation.
 */
export default function ScanCapture({ profile }: { profile: Profile }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queuedId = params.get('queued');

  const [phase, setPhase] = useState<Phase>('camera');
  const [preview, setPreview] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [errorCode, setErrorCode] = useState<ScanErrorCode>('unknown');
  const [savedGameId, setSavedGameId] = useState<string | null>(null);
  const [savedVerified, setSavedVerified] = useState(false);
  const [savedTop, setSavedTop] = useState<{ name: string; score: number } | null>(null);
  const [savedHighlights, setSavedHighlights] = useState<string[]>([]);
  const [queuedGroupId, setQueuedGroupId] = useState<string | null>(null);
  /** the upload behind the current attempt, so an abandoned scan doesn’t leave a photo behind */
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  // Resuming a scan the queue already read while you were offline.
  useEffect(() => {
    if (!queuedId) return;
    let cancelled = false;
    getQueuedScan(queuedId).then((item) => {
      if (cancelled || !item?.result || !item.photoPath) return;
      setPreview(URL.createObjectURL(item.blob));
      setQueuedGroupId(item.groupId);
      setLoaded({
        photoPath: item.photoPath,
        result: item.result,
        players: toReviewPlayers(item.result),
      });
      setPhase('review');
    });
    return () => {
      cancelled = true;
    };
  }, [queuedId]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  // The stamp lands first (320ms), then the celebration — design §5.3d asks
  // for the badge and then "a brief celebration if PB/milestone", in that order.
  useEffect(() => {
    if (phase !== 'done' || savedHighlights.length === 0) return;
    const timer = window.setTimeout(
      () => celebrate(gameCelebration(savedHighlights, savedGameId ?? undefined)),
      360,
    );
    return () => window.clearTimeout(timer);
  }, [phase, savedHighlights, savedGameId]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    let blob: Blob = file;
    try {
      blob = await compressPhoto(file);
    } catch {
      /* a browser that can’t decode it still gets to try the upload */
    }
    setPreview(URL.createObjectURL(blob));

    if (!navigator.onLine) {
      await queueIt(blob);
      return;
    }

    setPhase('processing');
    try {
      const photoPath = await uploadScan(profile.id, blob);
      setUploadedPath(photoPath);
      const result = await runExtraction(photoPath);
      setLoaded({ photoPath, result, players: toReviewPlayers(result) });
      setPhase('review');
    } catch (err) {
      const code = err instanceof ScanError ? err.code : 'unknown';
      // Signal problems are not failures — they are a queue.
      if (code === 'model_unreachable' || code === 'unknown') {
        if (!navigator.onLine) {
          await queueIt(blob);
          return;
        }
      }
      setErrorCode(code);
      setPhase('error');
    }
  }

  async function queueIt(blob: Blob) {
    await enqueueScan({
      blob,
      playedAt: new Date().toISOString(),
      groupId: null,
      venueName: null,
    });
    setPhase('queued');
  }

  /**
   * A photo we uploaded and nobody kept is rubbish in the bucket. Drop it —
   * unless it belongs to a queued scan, which still owns its own copy.
   */
  function discardUpload() {
    if (uploadedPath && !queuedId) void deleteScanPhoto(uploadedPath);
    setUploadedPath(null);
  }

  function retake() {
    discardUpload();
    setLoaded(null);
    setPhase('camera');
    cameraInput.current?.click();
  }

  const hiddenInputs = (
    <>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <input
        ref={galleryInput}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </>
  );

  if (phase === 'review' && loaded) {
    return (
      <>
        {hiddenInputs}
        <ReviewScan
          profile={profile}
          photoPath={loaded.photoPath}
          result={loaded.result}
          players={loaded.players}
          initialGroupId={queuedGroupId}
          initialVenue={null}
          playedAt={new Date().toISOString()}
          onRetake={retake}
          onDiscard={() => {
            discardUpload();
            navigate('/');
          }}
          onConfirmed={(gameId, rows, verification, highlights) => {
            if (queuedId) removeQueuedScan(queuedId);
            setUploadedPath(null); // the game owns the photo now

            setSavedGameId(gameId);
            setSavedVerified(verification === 'verified');
            setSavedTop(topScore(rows));
            setSavedHighlights(highlights);
            setPhase('done');
          }}
        />
      </>
    );
  }

  if (phase === 'processing') {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center gap-6 px-6 py-6">
        <div className="relative h-[360px] overflow-hidden rounded-2xl border border-line bg-gradient-to-b from-[#0F1B29] to-[#060A10]">
          {preview && <img src={preview} alt="" className="size-full object-contain opacity-80" />}
          <span
            className="scan-line pointer-events-none absolute inset-x-0 h-[2.5px] bg-phosphor"
            style={{ boxShadow: '0 0 22px 6px rgb(255 174 43 / .5)' }}
            aria-hidden
          />
        </div>
        <div className="flex flex-col items-center gap-2 text-center" role="status">
          <p className="font-display text-[20px] font-bold">Reading the grid</p>
          <ProcessingTicker />
        </div>
        <p className="text-center text-[12px] text-faint">Keep hold — a few seconds</p>
      </div>
    );
  }

  if (phase === 'queued') {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center gap-6 px-6 py-6">
        <div className="relative h-[280px] overflow-hidden rounded-2xl border border-line bg-well opacity-80">
          {preview && <img src={preview} alt="" className="size-full object-contain" />}
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-line bg-panel px-3 py-1">
            <span className="size-1.5 rounded-full bg-dim" />
            <span className="text-[10px] font-bold text-dim">Queued</span>
          </span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-display text-[20px] font-bold">No signal — saved to your queue</p>
          <p className="text-[13.5px] leading-relaxed text-dim">
            We’ll scan this when you’re back online and let you know. Nothing to redo.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link
            to="/profile"
            className="press grid h-[52px] place-items-center rounded-xl border border-line font-display text-[14px] font-bold text-text"
          >
            See the queue
          </Link>
          <Link to="/" className="grid h-12 place-items-center text-[13px] font-bold text-dim">
            Keep bowling
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    const copy = ERROR_COPY[errorCode];
    return (
      <div className="flex min-h-[70vh] flex-col justify-center gap-6 px-6 py-6">
        {hiddenInputs}
        <div className="relative h-[240px] overflow-hidden rounded-2xl border border-line bg-well">
          {preview && <img src={preview} alt="" className="size-full object-contain opacity-50" />}
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-display text-[20px] font-bold">{copy.title}</p>
          <p className="text-[13.5px] leading-relaxed text-dim">{copy.body}</p>
        </div>
        <div className="flex flex-col gap-2">
          {errorCode !== 'daily_cap' && (
            <button
              type="button"
              onClick={retake}
              className="press grid h-[52px] place-items-center rounded-xl bg-phosphor font-display text-[15px] font-bold text-ink shadow-glow-amber"
            >
              Take it again
            </button>
          )}
          <Link
            to="/add/manual"
            className="press grid h-[52px] place-items-center rounded-xl border border-line font-display text-[14px] font-bold text-text"
          >
            Enter the frames
          </Link>
          <Link
            to="/"
            onClick={discardUpload}
            className="grid h-12 place-items-center text-[13px] font-bold text-dim"
          >
            Not now
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="relative flex min-h-[70vh] flex-col justify-center gap-6 px-8 py-6 text-center">
        <div className="flex flex-col items-center gap-5">
          <span
            className={`stamp-in rounded-lg px-5 py-2.5 font-display text-[15px] font-extrabold tracking-[.14em] ${
              savedVerified ? 'bg-phosphor text-ink shadow-glow-amber' : 'border border-line text-dim'
            }`}
          >
            {savedVerified ? '✓ VERIFIED' : 'UNVERIFIED'}
          </span>
          <div className="flex flex-col gap-1.5">
            <p className="font-display text-[24px] font-bold">Scanned and on the board</p>
            <p className="text-[14px] leading-relaxed text-dim">
              {savedVerified
                ? 'Every frame recomputed against the monitor.'
                : 'Saved as entered — the frames didn’t match the printed totals.'}
            </p>
          </div>
          {savedTop && (
            <div className="flex items-center gap-3 rounded-xl border border-phosphor/40 bg-panel px-4 py-3 shadow-glow-amber">
              <span className="score-text text-[26px] font-bold text-phosphor">{savedTop.score}</span>
              <span className="text-[13px] font-bold text-text">{savedTop.name}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate(savedGameId ? `/games/${savedGameId}` : '/')}
            className="press grid h-[52px] place-items-center rounded-xl bg-phosphor font-display text-[15px] font-bold text-ink shadow-glow-amber"
          >
            See it in the feed
          </button>
          <button
            type="button"
            onClick={() => {
              setLoaded(null);
              setSavedGameId(null);
              setPhase('camera');
            }}
            className="grid h-12 place-items-center text-[13px] font-bold text-dim"
          >
            Scan the next game
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-78px)] flex-col px-4 py-4">
      {hiddenInputs}
      <header className="flex items-center">
        <Link to="/" className="text-[14px] font-bold text-text">
          Cancel
        </Link>
        <h1 className="mx-auto font-display text-[15px] font-bold tracking-[.04em]">Scan scoreboard</h1>
        <span className="w-12" />
      </header>

      <div className="relative mx-1 my-3 flex-1 rounded-xl">
        <Corner className="left-0 top-0 rounded-tl-lg border-l-[3px] border-t-[3px]" />
        <Corner className="right-0 top-0 rounded-tr-lg border-r-[3px] border-t-[3px]" />
        <Corner className="bottom-0 left-0 rounded-bl-lg border-b-[3px] border-l-[3px]" />
        <Corner className="bottom-0 right-0 rounded-br-lg border-b-[3px] border-r-[3px]" />
        <div className="absolute left-1/2 top-[38%] w-[230px] -translate-x-1/2 -translate-y-1/2 rounded-md border border-mark/25 bg-well/50 py-10 text-center">
          <span className="label-caps">Lane monitor</span>
        </div>
        <div className="absolute inset-x-0 bottom-16 flex flex-col items-center gap-2 px-4 text-center">
          <span className="rounded-full border border-line bg-ink/85 px-4 py-2 text-[12.5px] font-bold text-text">
            Fill the frame with the scoreboard
          </span>
          <span className="text-[11.5px] text-dim">Wait for the score grid, not the adverts</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 pb-6">
        <button
          type="button"
          onClick={() => galleryInput.current?.click()}
          aria-label="Choose a photo"
          className="press grid size-12 place-items-center rounded-[10px] border border-line bg-well text-dim"
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
            <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
            <path d="M3.5 15 L9 10 L14 15 L17 12.5 L20.5 15.5" />
            <circle cx="15.5" cy="8" r="1.6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          aria-label="Take the photo"
          className="press grid size-[76px] place-items-center rounded-full border-4 border-text"
        >
          <span className="size-[58px] rounded-full bg-phosphor shadow-glow-amber" />
        </button>
        <span className="size-12" />
      </div>
    </div>
  );
}

function Corner({ className }: { className: string }) {
  return <span className={`absolute size-9 border-phosphor ${className}`} aria-hidden />;
}

/** The processing screen’s staged status line — the reader’s actual order of work. */
function ProcessingTicker() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStage(1), 1400),
      window.setTimeout(() => setStage(2), 3200),
    ];
    return () => timers.forEach(window.clearTimeout);
  }, []);
  const label =
    stage === 0 ? 'READING NAMES…' : stage === 1 ? 'NAMES ✓ · READING FRAMES…' : 'NAMES ✓ · FRAMES ✓ · CHECKING TOTALS…';
  return <span className="label-caps">{label}</span>;
}

function topScore(rows: { displayedName: string; frames: { rolls: unknown[] }[] }[]) {
  let best: { name: string; score: number } | null = null;
  for (const row of rows) {
    try {
      const scored = score(row.frames as never);
      if (scored.total !== null && (!best || scored.total > best.score)) {
        best = { name: row.displayedName, score: scored.total };
      }
    } catch {
      /* an unscoreable row just doesn’t win */
    }
  }
  return best;
}
