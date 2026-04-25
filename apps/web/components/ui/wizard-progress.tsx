import { cn } from '@/lib/cn';
import * as React from 'react';

export interface WizardProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number;
  total: number;
  /** Left-side label for the step counter row (typically `t('step', { current, total })`). */
  leading?: React.ReactNode;
  /** Right-side label, e.g. price total. */
  label?: React.ReactNode;
}

export const WizardProgress = React.forwardRef<HTMLDivElement, WizardProgressProps>(
  ({ step, total, leading, label, className, ...rest }, ref) => {
    const safeTotal = Math.max(1, total);
    const safeStep = Math.max(0, Math.min(safeTotal, step));
    return (
      <div ref={ref} className={cn('flex min-w-0 flex-col gap-2', className)} {...rest}>
        <div className="flex min-w-0 items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-mute)]">
          {leading ? <span className="min-w-0 truncate">{leading}</span> : <span />}
          {label ? (
            <span className="min-w-0 truncate font-semibold text-[var(--color-accent)]">
              {label}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 gap-1">
          {Array.from({ length: safeTotal }).map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: segment positions are stable
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i < safeStep ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-bg-2)]',
              )}
            />
          ))}
        </div>
      </div>
    );
  },
);
WizardProgress.displayName = 'WizardProgress';
