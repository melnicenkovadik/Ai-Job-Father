import * as React from 'react';
import { cn } from '@/lib/cn';

/**
 * Explicit horizontal scroller. Any horizontal scrolling in feature screens
 * MUST wrap in `<HScroll>`. Bare `overflow-x` elsewhere is rejected in review.
 *
 * Hides the scrollbar cosmetics — the scroll hint comes from the edge fade or
 * design context (Phase 2+).
 */
export const HScroll = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, style, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex w-full min-w-0 gap-3 overflow-x-auto overscroll-x-contain',
        '[&::-webkit-scrollbar]:hidden',
        className,
      )}
      style={{ scrollbarWidth: 'none', ...style }}
      {...rest}
    />
  ),
);
HScroll.displayName = 'HScroll';
