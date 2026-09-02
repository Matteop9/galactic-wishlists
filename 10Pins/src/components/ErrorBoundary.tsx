import { Component, type ErrorInfo, type ReactNode } from 'react';
import Wordmark from './Wordmark';

/**
 * The last line of defence (COUNCIL_REVIEW_TODO item 12). Without this, one
 * render throw anywhere gives a white screen with no way back — and this
 * release adds canvas rendering and celebration overlays, which are exactly
 * the kind of code that throws on a device you haven't tested.
 *
 * Deliberately not clever: no error reporting service, no retry-in-place. It
 * tells you what happened and gives you the one action that reliably works.
 */
export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Nothing collects these yet, so the console is the only record there is.
    console.error('10 Pins crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col justify-center gap-8 px-6 py-12">
        <div className="flex flex-col items-center gap-3">
          <Wordmark />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-display text-[20px] font-bold">That screen broke</p>
          <p className="text-[13.5px] leading-relaxed text-dim">
            Nothing you did — and nothing you've scored is lost. Reloading usually sorts it.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="press rounded-[10px] bg-phosphor py-3.5 font-display text-[15px] font-bold text-ink shadow-glow-amber"
        >
          Reload 10 Pins
        </button>
        <p className="text-center text-[11px] text-faint">{this.state.error.message}</p>
      </div>
    );
  }
}
