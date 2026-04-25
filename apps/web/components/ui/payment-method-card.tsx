import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import * as React from 'react';

export type PaymentMethod = 'stars' | 'ton';

export interface PaymentMethodCardProps {
  method: PaymentMethod;
  selected: boolean;
  onSelect: () => void;
  amount: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
}

const META: Record<PaymentMethod, { label: string; sub: string }> = {
  stars: { label: 'Telegram Stars', sub: 'Мгновенно, в один клик' },
  ton: { label: 'TON', sub: 'Через TON Connect' },
};

export const PaymentMethodCard = React.forwardRef<HTMLButtonElement, PaymentMethodCardProps>(
  ({ method, selected, onSelect, amount, hint, className }, ref) => (
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
        <span className="block truncate text-[15px] font-semibold text-[var(--color-text)]">
          {META[method].label}
        </span>
        <span className="block truncate text-[12px] text-[var(--color-text-dim)]">
          {hint ?? META[method].sub}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[15px] font-semibold text-[var(--color-text)]">
        {amount}
      </span>
    </button>
  ),
);
PaymentMethodCard.displayName = 'PaymentMethodCard';
