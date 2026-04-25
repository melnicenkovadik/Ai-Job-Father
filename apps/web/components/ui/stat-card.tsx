import { cn } from '@/lib/cn';
import * as React from 'react';

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  hint?: string;
}

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ label, value, hint, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3',
        className,
      )}
      {...rest}
    >
      <div className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-dim)]">
        {label}
      </div>
      <div className="font-mono text-[22px] font-semibold leading-none text-[var(--color-text)]">
        {value}
      </div>
      {hint ? <div className="text-[11px] text-[var(--color-text-mute)]">{hint}</div> : null}
    </div>
  ),
);
StatCard.displayName = 'StatCard';
