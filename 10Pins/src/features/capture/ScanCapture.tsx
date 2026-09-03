import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReviewScan from './ReviewScan';
import Icon from '../../components/Icon';
import Strip, { StripRow } from '../../components/Strip';
import VerificationBadge from '../../components/VerificationBadge';
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
    title: 'Could not read that one',
    body: 'Fill the frame with the score grid and keep glare off it, or enter the frames yourself.',
  },
  daily_cap: {
    title: 'That is today’s scans used up',
    body: 'Scanning resets 24 hours after your first one. You can still score live or enter frames yourself.',
  },
  model_failed: {
    title: 'Could not read the scores this time',
    body: 'Your photo is fine. Try again in a minute, or enter the frames yourself.',
  },
  model_unreachable: {
    title: 'Could not reach the reader',
    body: 'Your photo is safe. Try again when you have signal.',
  },
  photo_missing: {
    title: 'That photo went missing',
    body: 'Take it again.',
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
    body: 'We will scan this when you are back online.',
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
  const [savedRows, setSavedRows] = useState<{ name: string; score: number | null }[]>([]);
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

  // The saved sheet lands first, then the celebration — design §5.3d asks
  // for the result and then "a brief celebration if PB/milestone", in that order.
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
            setSavedRows(scoresOf(rows));
            setSavedHighlights(highlights);
            setPhase('done');
          }}
        />
      </>
    );
  }

  if (phase === 'processing') {
    return (
      <CameraStage title="Scan a scoreboard" busy>
        <div className="relative m-4 flex-1 overflow-hidden bg-[#201d17]">
          {preview && <img src={preview} alt="" className="size-full object-contain" />}
          <Brackets />
          <div
            className="absolute inset-x-0 bottom-[18px] flex flex-col items-center gap-1 px-4 text-center"
            role="status"
          >
            <span className="text-[14px]">Reading the sheet</span>
            <ProcessingTicker />
          </div>
        </div>
        <p className="py-4 text-center text-[13px] text-[#a39b8b]">Keep hold, a few seconds</p>
      </CameraStage>
    );
  }

  if (phase === 'queued') {
    return (
      <div className="flex flex-col gap-4 px-5 py-5">
        <h1 className="num text-[22px] font-semibold leading-tight">No signal</h1>
        <Strip soft>
          {preview && (
            <div className="h-[200px] bg-card">
              <img src={preview} alt="" className="size-full object-contain" />
            </div>
          )}
          <p className="p-3.5 text-[13px] text-ink-faded">
            Saved to your queue. It will be read when you are back online.
          </p>
        </Strip>
        <div className="flex flex-col gap-3">
          <Link to="/profile" className="btn-secondary">
            See the queue
          </Link>
          <Link to="/" className="press py-2.5 text-center text-[13px] font-semibold text-blue">
            Keep bowling
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'error') {
    const copy = ERROR_COPY[errorCode];
    return (
      <div className="flex flex-col gap-4 px-5 py-5">
        {hiddenInputs}
        <h1 className="num text-[22px] font-semibold leading-tight">Scan a scoreboard</h1>
        <Strip soft>
          {preview && (
            <div className="h-[200px] bg-card">
              <img src={preview} alt="" className="size-full object-contain" />
            </div>
          )}
          <div className="flex flex-col gap-1 p-3.5" role="alert">
            <p className="text-[13px] font-semibold text-red">{copy.title}</p>
            <p className="text-[13px] text-ink-faded">{copy.body}</p>
          </div>
        </Strip>
        <div className="flex flex-col gap-3">
          {errorCode !== 'daily_cap' && (
            <button type="button" onClick={retake} className="btn-primary">
              Take it again
            </button>
          )}
          <Link to="/add/manual" className="btn-secondary">
            Enter the frames
          </Link>
          <Link
            to="/"
            onClick={discardUpload}
            className="press py-2.5 text-center text-[13px] font-semibold text-blue"
          >
            Not now
          </Link>
        </div>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col gap-4 px-5 py-5">
        <h1 className="num text-[22px] font-semibold leading-tight">Scanned and on the board</h1>
        <Strip>
          <div className="flex items-baseline justify-between gap-2 px-3.5 py-2.5">
            <span className="label">Result</span>
            <VerificationBadge status={savedVerified ? 'verified' : 'unverified'} />
          </div>
          {savedRows.map((row, i) => (
            <StripRow
              key={`${row.name}-${i}`}
              right={
                <span className={`num text-[18px] font-semibold ${row.score === null ? 'text-ink-faded' : ''}`}>
                  {row.score ?? '–'}
                </span>
              }
            >
              <span className="num text-[15px] font-semibold">{row.name}</span>
            </StripRow>
          ))}
        </Strip>
        <p className="text-[13px] text-ink-faded">
          {savedVerified
            ? 'Every frame was checked against the photo.'
            : 'Saved as entered. The frames did not match the printed totals.'}
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => navigate(savedGameId ? `/games/${savedGameId}` : '/')}
            className="btn-primary"
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
            className="btn-secondary"
          >
            Scan the next game
          </button>
        </div>
      </div>
    );
  }

  return (
    <CameraStage title="Scan a scoreboard" onClose={() => navigate('/')}>
      {hiddenInputs}
      <div className="relative m-4 flex-1 overflow-hidden bg-[#201d17]">
        <Brackets />
        <p className="absolute inset-x-0 bottom-[18px] px-4 text-center text-[14px]">
          Fill the frame with the scoreboard
        </p>
      </div>

      <div className="flex items-center justify-center gap-11 py-4">
        <button
          type="button"
          onClick={() => galleryInput.current?.click()}
          aria-label="Choose a photo"
          className="press w-16 py-3 text-left text-[14px] text-[#a39b8b]"
        >
          Photos
        </button>
        <button
          type="button"
          onClick={() => cameraInput.current?.click()}
          aria-label="Take the photo"
          className="press grid size-[70px] place-items-center rounded-full border-4 border-[#ece6d9]"
        >
          <span className="size-[54px] rounded-full bg-[#ece6d9]" />
        </button>
        <span className="w-16" aria-hidden />
      </div>
    </CameraStage>
  );
}

/**
 * The camera view is dark whatever the theme, so it uses literal colours
 * rather than the paper tokens: the one place in the app that does.
 */
function CameraStage({
  title,
  onClose,
  busy = false,
  children,
}: {
  title: string;
  onClose?: () => void;
  busy?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-96px)] flex-col bg-[#171511] text-[#ece6d9] lg:min-h-[calc(100dvh-40px)]">
      <header className="flex items-center justify-between px-5 py-2.5">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="press -ml-2.5 flex size-11 items-center justify-center"
          >
            <Icon name="x" className="size-6" />
          </button>
        ) : (
          <span className="w-6" aria-hidden />
        )}
        <h1 className="num text-[17px] font-semibold">{title}</h1>
        <span className="w-6" aria-hidden />
      </header>
      {busy && <span aria-hidden className="progress-line mx-4 block" />}
      {children}
    </div>
  );
}

/** The four corner brackets of the viewfinder: 34px, 3px stroke, 24px in. */
function Brackets() {
  return (
    <>
      <span aria-hidden className="absolute left-6 top-6 size-[34px] border-l-[3px] border-t-[3px] border-[#ece6d9]" />
      <span aria-hidden className="absolute right-6 top-6 size-[34px] border-r-[3px] border-t-[3px] border-[#ece6d9]" />
      <span aria-hidden className="absolute bottom-6 left-6 size-[34px] border-b-[3px] border-l-[3px] border-[#ece6d9]" />
      <span aria-hidden className="absolute bottom-6 right-6 size-[34px] border-b-[3px] border-r-[3px] border-[#ece6d9]" />
    </>
  );
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
    stage === 0 ? 'Reading names' : stage === 1 ? 'Names read, reading frames' : 'Checking totals';
  return <span className="text-[13px] text-[#a39b8b]">{label}</span>;
}

/** Every player's total from the saved rows, best first, so the sheet reads like a result. */
function scoresOf(rows: { displayedName: string; frames: { rolls: unknown[] }[] }[]) {
  const scored = rows.map((row) => {
    try {
      return { name: row.displayedName, score: score(row.frames as never).total };
    } catch {
      /* an unscoreable row still gets its name on the sheet */
      return { name: row.displayedName, score: null };
    }
  });
  return scored.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
}
