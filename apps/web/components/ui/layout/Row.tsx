import * as React from 'react';
import { cn } from '@/lib/cn';
import type { Gap } from './Stack';

export interface RowProps extends React.HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
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
const ALIGN_CLASS: Record<NonNullable<RowProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};
const JUSTIFY_CLASS: Record<NonNullable<RowProps['justify']>, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

/**
 * Horizontal flex row. Default alignment: center. Children get `min-w-0` for free
 * so truncation works predictably.
 */
export const Row = React.forwardRef<HTMLDivElement, RowProps>(
  (
    { className, gap = 3, align = 'center', justify = 'start', wrap = false, ...rest },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 flex-row',
        GAP_CLASS[gap],
        ALIGN_CLASS[align],
        JUSTIFY_CLASS[justify],
        wrap && 'flex-wrap',
        className,
      )}
      {...rest}
    />
  ),
);
Row.displayName = 'Row';
