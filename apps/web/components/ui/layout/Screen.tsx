import * as React from 'react';
import { cn } from '@/lib/cn';

export interface ScreenProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Reserve 96px bottom padding for Telegram MainButton (R-13.8). Default true. */
  reserveMainButton?: boolean;
}

/**
 * Root screen container.
 *
 * - Binds to `--tg-viewport-height` (fallback 100vh) — avoids the iOS address-bar
 *   jitter that plain `100vh` causes (R-13.2).
 * - Respects device safe areas via `env(safe-area-inset-*)` (R-13.7).
 * - Hides horizontal overflow (R-13.4).
 * - Adds bottom padding so content never hides behind the Telegram MainButton.
 */
export const Screen = React.forwardRef<HTMLDivElement, ScreenProps>(
  ({ className, reserveMainButton = true, children, style, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex min-h-[var(--tg-viewport-height,100vh)] w-full min-w-0 flex-col',
        'bg-[var(--color-bg)] text-[var(--color-text)]',
        'overflow-x-hidden',
        reserveMainButton && 'pb-[var(--mainbtn-h,96px)]',
        className,
      )}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  ),
);
Screen.displayName = 'Screen';
