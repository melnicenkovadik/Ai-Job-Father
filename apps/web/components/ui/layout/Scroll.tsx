import { cn } from '@/lib/cn';
import * as React from 'react';

/**
 * The ONLY place `overflow-y: auto` lives in this codebase.
 * `min-h-0 flex-1` is the flex recipe that lets a child actually scroll while
 * its flex parent remains height-constrained.
 *
 * Any new `overflow-y` elsewhere must go through <Scroll>. PRs adding bare
 * `overflow-y` outside this file are rejected in review (CLAUDE.md §7).
 */
export const Scroll = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', className)}
      {...rest}
    />
  ),
);
Scroll.displayName = 'Scroll';
