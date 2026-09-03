import Wordmark from './Wordmark';

export default function Splash() {
  return (
    <div className="fade-in-base flex min-h-dvh flex-col items-center justify-center gap-3 bg-paper">
      <Wordmark />
      <p className="text-[13px] text-ink-faded">The scoresheet for your bowling group</p>
    </div>
  );
}
