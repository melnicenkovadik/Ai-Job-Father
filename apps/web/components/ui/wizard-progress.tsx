import { cn } from '@/lib/cn';
import * as React from 'react';

export interface WizardProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  step: number;
  total: number;
  label?: React.ReactNode;
}

export const WizardProgress = React.forwardRef<HTMLDivElement, WizardProgressProps>(
  ({ step, total, label, className, ...rest }, ref) => {
    const safeTotal = Math.max(1, total);
    const safeStep = Math.max(0, Math.min(safeTotal, step));
    return (
      <div ref={ref} className={cn('flex min-w-0 flex-col gap-2', className)} {...rest}>
        <div className="flex min-w-0 items-baseline justify-between gap-2 font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-mute)]">
          <span>
            ШАГ {String(safeStep).padStart(2, '0')} / {String(safeTotal).padStart(2, '0')}
          </span>
          {label ? (
            <span className="min-w-0 truncate text-[var(--color-text-dim)]">{label}</span>
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
