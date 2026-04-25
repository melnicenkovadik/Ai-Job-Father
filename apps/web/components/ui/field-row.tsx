import { cn } from '@/lib/cn';
import * as React from 'react';

export interface FieldRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  mono?: boolean;
  trailing?: React.ReactNode;
}

export const FieldRow = React.forwardRef<HTMLDivElement, FieldRowProps>(
  ({ label, value, mono = false, trailing, className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 items-center gap-3 border-b border-[var(--color-border)] py-3 last:border-b-0',
        className,
      )}
      {...rest}
    >
      <div className="min-w-0 flex-1 truncate text-[13px] text-[var(--color-text-dim)]">
        {label}
      </div>
      <div
        className={cn(
          'min-w-0 flex-1 truncate text-right text-[14px] text-[var(--color-text)]',
          mono && 'font-mono tabular-nums',
        )}
      >
        {value}
      </div>
      {trailing ? <div className="shrink-0">{trailing}</div> : null}
    </div>
  ),
);
FieldRow.displayName = 'FieldRow';
