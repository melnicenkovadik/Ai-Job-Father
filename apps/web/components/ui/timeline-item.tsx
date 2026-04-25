import { cn } from '@/lib/cn';
import * as React from 'react';

export type TimelineKind =
  | 'paid'
  | 'started'
  | 'found'
  | 'applied'
  | 'completed'
  | 'failed'
  | 'info';

const KIND_COLOR: Record<TimelineKind, string> = {
  paid: 'var(--color-accent)',
  started: 'var(--color-text-dim)',
  found: 'var(--color-text-dim)',
  applied: 'var(--color-success)',
  completed: 'var(--color-success)',
  failed: 'var(--color-danger)',
  info: 'var(--color-text-mute)',
};

export interface TimelineItemProps extends React.HTMLAttributes<HTMLDivElement> {
  time: string;
  kind: TimelineKind;
  text: React.ReactNode;
  isLast?: boolean;
}

export const TimelineItem = React.forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ time, kind, text, isLast = false, className, ...rest }, ref) => (
    <div ref={ref} className={cn('relative flex min-w-0 gap-3', className)} {...rest}>
      <div className="relative flex shrink-0 flex-col items-center">
        <span
          aria-hidden
          className="mt-2 size-2 shrink-0 rounded-full"
          style={{ background: KIND_COLOR[kind] }}
        />
        {!isLast ? (
          <span aria-hidden className="mt-1 w-px flex-1 bg-[var(--color-border)]" />
        ) : null}
      </div>
      <div className="min-w-0 flex-1 pb-3">
        <div className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-text-mute)]">
          {time}
        </div>
        <div className="mt-0.5 min-w-0 text-[14px] text-[var(--color-text)] [overflow-wrap:anywhere]">
          {text}
        </div>
      </div>
    </div>
  ),
);
TimelineItem.displayName = 'TimelineItem';
