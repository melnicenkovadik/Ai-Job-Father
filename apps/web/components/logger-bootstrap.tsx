'use client';

import { attachGlobalErrorListeners, getBrowserLogger } from '@/lib/logger';
import { useEffect } from 'react';

/**
 * Mount-once bootstrapper: attaches `window.error` /
 * `window.unhandledrejection` listeners, and emits a session-start info
 * event so we can confirm the logger pipeline is alive end-to-end.
 */
export function LoggerBootstrap(): null {
  useEffect(() => {
    attachGlobalErrorListeners();
    getBrowserLogger().info({
      context: 'session-start',
      message: 'mini-app session started',
    });
  }, []);
  return null;
}
