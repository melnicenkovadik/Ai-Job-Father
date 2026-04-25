import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import * as React from 'react';

export type MoneyCurrency = 'STARS' | 'TON' | 'USD';

export interface MoneyDisplayProps extends React.HTMLAttributes<HTMLDivElement> {
  amount: number | string;
  currency: MoneyCurrency;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  withIcon?: boolean;
}

const SIZE_CLASS = {
  sm: 'text-[14px]',
  md: 'text-[18px]',
  lg: 'text-[28px]',
  xl: 'text-[42px]',
} as const;

const CURRENCY_LABEL: Record<MoneyCurrency, string> = {
  STARS: 'Stars',
  TON: 'TON',
  USD: 'USD',
};

const CurrencyIcon = ({ currency, size }: { currency: MoneyCurrency; size: number }) => {
  if (currency === 'STARS')
    return <Icon.Star size={size} className="text-[var(--color-star-gold)]" />;
  if (currency === 'TON') return <Icon.Ton size={size} className="text-[var(--color-ton-blue)]" />;
  return <span className="font-semibold">$</span>;
};

export const MoneyDisplay = React.forwardRef<HTMLDivElement, MoneyDisplayProps>(
  ({ amount, currency, size = 'md', withIcon = true, className, ...rest }, ref) => {
    const iconSize = size === 'xl' ? 32 : size === 'lg' ? 24 : size === 'md' ? 18 : 14;
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex min-w-0 items-baseline gap-2 font-mono font-semibold tabular-nums leading-none text-[var(--color-text)]',
          SIZE_CLASS[size],
          className,
        )}
        {...rest}
      >
        {withIcon ? (
          <span className="inline-flex items-center self-center">
            <CurrencyIcon currency={currency} size={iconSize} />
          </span>
        ) : null}
        <span className="min-w-0 truncate">{amount}</span>
        <span className="text-[var(--color-text-dim)] text-[0.55em] uppercase tracking-wider">
          {CURRENCY_LABEL[currency]}
        </span>
      </div>
    );
  },
);
MoneyDisplay.displayName = 'MoneyDisplay';
