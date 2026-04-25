import { cn } from '@/lib/cn';
import * as React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ checked, onChange, label, description, disabled = false, className }, ref) => {
    const switchEl = (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
          checked
            ? 'bg-[var(--color-accent)]'
            : 'bg-[var(--color-bg-2)] border border-[var(--color-border)]',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'inline-block size-5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0.5',
          )}
        />
      </button>
    );

    if (!label && !description) {
      return <span className={className}>{switchEl}</span>;
    }

    return (
      <div className={cn('flex min-w-0 items-center gap-3 py-2', className)}>
        <div className="min-w-0 flex-1">
          {label ? (
            <div className="text-[14px] font-medium text-[var(--color-text)]">{label}</div>
          ) : null}
          {description ? (
            <div className="text-[12px] text-[var(--color-text-dim)]">{description}</div>
          ) : null}
        </div>
        {switchEl}
      </div>
    );
  },
);
Toggle.displayName = 'Toggle';
