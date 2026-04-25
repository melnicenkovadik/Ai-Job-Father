'use client';

import { cn } from '@/lib/cn';
import * as React from 'react';

export interface FabProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: React.ReactNode;
}

/**
 * Floating action button. Sits bottom-right above the BottomTabBar and the
 * Telegram MainButton reservation. The literal pixel offsets are layout-safe
 * because <Screen reserveMainButton> reserves the matching gutter.
 */
export const Fab = React.forwardRef<HTMLButtonElement, FabProps>(
  ({ label, icon, className, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        /* layout-safe: anchored above bottom tab bar (~64px) + Telegram MainButton reserve. */
        'fixed bottom-[calc(var(--mainbtn-h,0px)+88px)] right-4 z-30 inline-flex size-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-lg shadow-[var(--color-accent)]/30 transition-transform active:scale-95',
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  ),
);
Fab.displayName = 'Fab';
