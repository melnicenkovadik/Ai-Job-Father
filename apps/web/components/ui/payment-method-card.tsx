import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import * as React from 'react';

export type PaymentMethod = 'stars' | 'ton';

export interface PaymentMethodCardProps {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
  amount: React.ReactNode;
  label: React.ReactNode;
  hint: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const PaymentMethodCard = React.forwardRef<HTMLButtonElement, PaymentMethodCardProps>(
  ({ method, selected, onSelect, amount, label, hint, badge, className }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-[var(--radius-lg)] border bg-[var(--color-surface)] p-4 text-left transition-colors',
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hi)]',
        className,
      )}
    >
      <span
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)]',
          method === 'stars'
            ? 'bg-[var(--color-bg-2)] text-[var(--color-star-gold)]'
            : 'bg-[var(--color-bg-2)] text-[var(--color-ton-blue)]',
        )}
      >
        {method === 'stars' ? <Icon.Star size={22} /> : <Icon.Ton size={22} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--color-text)]">
            {label}
          </span>
          {badge ? (
            <span className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-ink)]">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[12px] text-[var(--color-text-dim)]">{hint}</span>
      </span>
      <span className="shrink-0 font-mono text-[15px] font-semibold text-[var(--color-text)]">
        {amount}
      </span>
    </button>
  ),
);
PaymentMethodCard.displayName = 'PaymentMethodCard';
