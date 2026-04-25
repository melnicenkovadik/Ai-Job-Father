import { cn } from '@/lib/cn';
import * as React from 'react';

export interface SnapshotJsonProps extends React.HTMLAttributes<HTMLDListElement> {
  data: Record<string, unknown>;
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.length === 0 ? '—' : value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const SnapshotJson = React.forwardRef<HTMLDListElement, SnapshotJsonProps>(
  ({ data, className, ...rest }, ref) => {
    const entries = Object.entries(data);
    return (
      <dl
        ref={ref}
        className={cn(
          'grid min-w-0 grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-bg-2)] p-3 font-mono text-[12px]',
          className,
        )}
        {...rest}
      >
        {entries.map(([key, value]) => (
          <React.Fragment key={key}>
            <dt className="min-w-0 truncate text-[var(--color-text-mute)]">{key}</dt>
            <dd className="min-w-0 truncate text-right text-[var(--color-text)] [overflow-wrap:anywhere]">
              {formatValue(value)}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    );
  },
);
SnapshotJson.displayName = 'SnapshotJson';
