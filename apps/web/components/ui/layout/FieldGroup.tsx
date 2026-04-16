import { cn } from '@/lib/cn';
import type * as React from 'react';

export interface FieldGroupProps {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  id?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Form-row primitive: label + input slot + optional hint/error.
 * `min-w-0` on the wrapper so long labels (RU/IT/UK) truncate instead of
 * forcing the input off-screen.
 */
export function FieldGroup({ label, hint, error, id, className, children }: FieldGroupProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)}>
      <label htmlFor={id} className="text-sm font-medium [overflow-wrap:anywhere]">
        {label}
      </label>
      {children}
      {hint !== undefined && !error && (
        <span className="text-xs opacity-70 [overflow-wrap:anywhere]">{hint}</span>
      )}
      {error !== undefined && (
        <span className="text-xs text-red-600 [overflow-wrap:anywhere]">{error}</span>
      )}
    </div>
  );
}
