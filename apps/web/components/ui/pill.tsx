import { cn } from '@/lib/cn';
import * as React from 'react';

type PillVariant = 'solid' | 'outline' | 'soft';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant;
  selected?: boolean;
  asButton?: boolean;
  onSelect?: () => void;
}

const VARIANT_CLASS: Record<PillVariant, string> = {
  solid: 'bg-[var(--color-bg-2)] text-[var(--color-text)] border border-[var(--color-border)]',
  outline: 'bg-transparent text-[var(--color-text)] border border-[var(--color-border-hi)]',
  soft: 'bg-[var(--color-accent-bg)] text-[var(--color-accent)] border border-transparent',
};

const SELECTED_CLASS =
  'bg-[var(--color-accent)] text-[var(--color-accent-ink)] border-[var(--color-accent)]';

export const Pill = React.forwardRef<HTMLSpanElement, PillProps>(
  (
    {
      variant = 'solid',
      selected = false,
      asButton = false,
      onSelect,
      className,
      children,
      ...rest
    },
    ref,
  ) => {
    if (asButton || onSelect) {
      return (
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            'inline-flex min-h-[2rem] min-w-0 items-center rounded-[var(--radius-full)] px-3 py-1.5 text-xs font-medium transition-colors',
            selected ? SELECTED_CLASS : VARIANT_CLASS[variant],
            className,
          )}
        >
          <span className="min-w-0 truncate">{children}</span>
        </button>
      );
    }
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex min-w-0 items-center rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-medium',
          selected ? SELECTED_CLASS : VARIANT_CLASS[variant],
          className,
        )}
        {...rest}
      >
        <span className="min-w-0 truncate">{children}</span>
      </span>
    );
  },
);
Pill.displayName = 'Pill';
