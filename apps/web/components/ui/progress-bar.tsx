import { cn } from '@/lib/cn';
import * as React from 'react';

type ProgressTone = 'accent' | 'success' | 'warn' | 'danger';

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  tone?: ProgressTone;
  glow?: boolean;
  thickness?: 'sm' | 'md';
}

const TONE_VAR: Record<ProgressTone, string> = {
  accent: 'var(--color-accent)',
  success: 'var(--color-success)',
  warn: 'var(--color-warn)',
  danger: 'var(--color-danger)',
};

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    { value, max = 100, tone = 'accent', glow = false, thickness = 'sm', className, ...rest },
    ref,
  ) => {
    const safeMax = max <= 0 ? 1 : max;
    const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));
    return (
      <div
        ref={ref}
        role="progressbar"
        tabIndex={0}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className={cn(
          'min-w-0 overflow-hidden rounded-full bg-[var(--color-bg-2)]',
          thickness === 'sm' ? 'h-1.5' : 'h-2.5',
          className,
        )}
        {...rest}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-500',
            glow && 'animate-[pulseSlow_1.2s_ease-in-out_infinite]',
          )}
          style={{
            width: `${pct}%`,
            background: TONE_VAR[tone],
            boxShadow: glow ? `0 0 12px ${TONE_VAR[tone]}` : undefined,
          }}
        />
      </div>
    );
  },
);
ProgressBar.displayName = 'ProgressBar';
