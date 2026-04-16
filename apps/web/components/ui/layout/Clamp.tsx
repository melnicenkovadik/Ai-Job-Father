'use client';
import { cn } from '@/lib/cn';
import * as React from 'react';

export interface ClampProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  lines: 1 | 2 | 3 | 4 | 5;
  expandable?: boolean;
  expandLabel?: string;
  collapseLabel?: string;
  children: React.ReactNode;
}

const LINE_CLAMP: Record<ClampProps['lines'], string> = {
  1: 'line-clamp-1',
  2: 'line-clamp-2',
  3: 'line-clamp-3',
  4: 'line-clamp-4',
  5: 'line-clamp-5',
};

/**
 * Multi-line truncation primitive. When `expandable`, a "Show more" toggle
 * reveals the full content. Phase 1 keeps the toggle animation-free; Motion
 * lands Phase 2 and Clamp will adopt it then without an API change.
 */
export function Clamp({
  lines,
  expandable = false,
  expandLabel = 'Show more',
  collapseLabel = 'Show less',
  className,
  children,
  ...rest
}: ClampProps) {
  const [expanded, setExpanded] = React.useState(false);
  const clampClass = expandable && expanded ? '' : LINE_CLAMP[lines];

  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)} {...rest}>
      <div className={cn('[overflow-wrap:anywhere]', clampClass)}>{children}</div>
      {expandable && (
        <button
          type="button"
          className="w-fit text-xs text-[var(--color-link)] underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? collapseLabel : expandLabel}
        </button>
      )}
    </div>
  );
}
