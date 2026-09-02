import Wordmark from './Wordmark';

export default function Splash() {
  return (
    <div className="fade-in-base flex min-h-dvh flex-col items-center justify-center gap-4 bg-ink">
      <Wordmark />
      <p className="text-[13.5px] text-dim">The app for your bowling crew</p>
    </div>
  );
}
