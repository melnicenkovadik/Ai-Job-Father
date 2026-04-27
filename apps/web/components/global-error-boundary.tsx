'use client';

import { getBrowserLogger } from '@/lib/logger';
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-of-tree error boundary that funnels every uncaught render error into
 * the central logger. The Next.js `(app)/error.tsx` boundary still sits
 * below it for route-scoped recovery; this one exists so that errors thrown
 * inside provider components themselves (where `error.tsx` cannot help) are
 * still captured.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    getBrowserLogger().error({
      context: 'global-error-boundary',
      message: error.message,
      data: { componentStack: info.componentStack ?? null },
      error,
    });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  override render(): ReactNode {
    if (this.state.error && this.props.fallback) {
      return this.props.fallback(this.state.error, this.reset);
    }
    if (this.state.error) {
      return (
        <div className="flex min-h-[var(--tg-viewport-height,100vh)] w-full min-w-0 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-sm opacity-70">{this.state.error.message}</p>
          <button
            type="button"
            onClick={this.reset}
            className="inline-flex min-h-[2.75rem] items-center justify-center rounded-md bg-[var(--color-button,#2481CC)] px-4 text-sm font-medium text-[var(--color-button-text,#ffffff)]"
          >
            Reset
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
