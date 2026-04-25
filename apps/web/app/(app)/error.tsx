'use client';

import { ErrorScreen } from '@/features/error/error-screen';
import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('[app-error-boundary]', error);
  }, [error]);

  return (
    <ErrorScreen
      code={error.digest ?? error.name ?? 'UNKNOWN'}
      detail={error.message}
      onRetry={reset}
    />
  );
}
