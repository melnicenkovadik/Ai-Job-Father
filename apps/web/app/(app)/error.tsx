'use client';

import { ErrorScreen } from '@/features/error/error-screen';
import { getBrowserLogger } from '@/lib/logger';
import { useEffect } from 'react';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppErrorBoundary({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    getBrowserLogger().error({
      context: 'app-error-boundary',
      message: error.message,
      data: { digest: error.digest ?? null },
      error,
    });
  }, [error]);

  return (
    <ErrorScreen
      code={error.digest ?? error.name ?? 'UNKNOWN'}
      detail={error.message}
      onRetry={reset}
    />
  );
}
