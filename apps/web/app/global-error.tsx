'use client';

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

/**
 * Top-level error boundary. Sentry recommends this for App Router so
 * uncaught render errors land in the dashboard. Below the route group
 * (`app/(app)/error.tsx`) handles the route-level errors with our
 * branded ErrorScreen — this one is the safety net above it.
 */
interface GlobalErrorProps {
  error: Error & { digest?: string };
}

export default function GlobalError({ error }: GlobalErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
