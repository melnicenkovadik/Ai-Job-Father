import { cn } from '@/lib/cn';
import * as React from 'react';
import { Spinner } from './spinner';

type ButtonVariant = 'solid' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  solid:
    'bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:brightness-110 active:brightness-95',
  outline:
    'border border-[var(--color-border-hi)] bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-hi)]',
  ghost: 'bg-transparent text-[var(--color-text)] hover:bg-[var(--color-surface-hi)]',
  danger: 'bg-[var(--color-danger)] text-white hover:brightness-110 active:brightness-95',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'min-h-[2.25rem] px-3 text-sm gap-1.5 rounded-[var(--radius-sm)]',
  md: 'min-h-[2.75rem] px-4 text-[15px] gap-2 rounded-[var(--radius-md)]',
  lg: 'min-h-[3.25rem] px-5 text-base gap-2 rounded-[var(--radius-lg)]',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'solid',
      size = 'md',
      loading = false,
      fullWidth = false,
      leadingIcon,
      trailingIcon,
      disabled,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex min-w-0 select-none items-center justify-center font-semibold leading-none transition-[filter,background-color,opacity] disabled:opacity-50 disabled:cursor-not-allowed',
        VARIANT_CLASS[variant],
        SIZE_CLASS[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={16} /> : leadingIcon}
      <span className="min-w-0 truncate">{children}</span>
      {!loading && trailingIcon}
    </button>
  ),
);
Button.displayName = 'Button';
