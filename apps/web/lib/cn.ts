import { clsx, type ClassValue } from 'clsx';

/**
 * Thin wrapper around clsx. If tailwind-merge becomes necessary to deduplicate
 * conflicting utilities, swap in here — callers don't change.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
