import { cn } from '@/lib/cn';
import * as React from 'react';

type CardSurface = 'surface' | 'surfaceHi' | 'bg2';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';
type CardRadius = 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  surface?: CardSurface;
  padding?: CardPadding;
  radius?: CardRadius;
  bordered?: boolean;
  interactive?: boolean;
}

const SURFACE_CLASS: Record<CardSurface, string> = {
  surface: 'bg-[var(--color-surface)]',
  surfaceHi: 'bg-[var(--color-surface-hi)]',
  bg2: 'bg-[var(--color-bg-2)]',
};

const PADDING_CLASS: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

const RADIUS_CLASS: Record<CardRadius, string> = {
  sm: 'rounded-[var(--radius-sm)]',
  md: 'rounded-[var(--radius-md)]',
  lg: 'rounded-[var(--radius-lg)]',
  xl: 'rounded-[var(--radius-xl)]',
};

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      surface = 'surface',
      padding = 'md',
      radius = 'lg',
      bordered = true,
      interactive = false,
      className,
      ...rest
    },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        'flex min-w-0 flex-col',
        SURFACE_CLASS[surface],
        PADDING_CLASS[padding],
        RADIUS_CLASS[radius],
        bordered && 'border border-[var(--color-border)]',
        interactive && 'cursor-pointer transition-colors hover:bg-[var(--color-surface-hi)]',
        className,
      )}
      {...rest}
    />
  ),
);
Card.displayName = 'Card';
