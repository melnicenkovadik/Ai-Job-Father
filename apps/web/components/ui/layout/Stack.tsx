import * as React from 'react';
import { cn } from '@/lib/cn';

export type Gap = 0 | 1 | 2 | 3 | 4 | 6 | 8;

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
}

const GAP_CLASS: Record<Gap, string> = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  6: 'gap-6',
  8: 'gap-8',
};

/**
 * Vertical flex column with `min-w-0` applied so long-string children can
 * truncate or wrap without forcing a horizontal scroll on the parent.
 */
export const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ className, gap = 3, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('flex min-w-0 flex-col', GAP_CLASS[gap], className)}
      {...rest}
    />
  ),
);
Stack.displayName = 'Stack';
