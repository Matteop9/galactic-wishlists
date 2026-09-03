import { Component, type ErrorInfo, type ReactNode } from 'react';
import Wordmark from './Wordmark';

/**
 * The last line of defence. Without this, one render throw anywhere gives a
 * blank screen with no way back.
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
          <h1 className="num text-[22px] font-semibold">That screen broke</h1>
          <p className="text-[14px] leading-relaxed text-ink-faded">
            Nothing you did, and nothing you have scored is lost. Reloading usually sorts it.
          </p>
        </div>
        <button type="button" onClick={() => window.location.reload()} className="btn-primary">
          Reload 10 Pins
        </button>
        <p className="text-center text-[12px] text-ink-faded">{this.state.error.message}</p>
      </div>
    );
  }
}
