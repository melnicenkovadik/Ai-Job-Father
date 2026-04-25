import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import * as React from 'react';

export interface LanguageTileProps extends React.HTMLAttributes<HTMLButtonElement> {
  code: string;
  label: string;
  level?: string;
  selected?: boolean;
  onSelect?: () => void;
}

export const LanguageTile = React.forwardRef<HTMLButtonElement, LanguageTileProps>(
  ({ code, label, level, selected = false, onSelect, className, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={cn(
        'flex min-h-[2.75rem] min-w-0 items-center gap-3 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 text-left transition-colors',
        selected
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-bg)]'
          : 'border-[var(--color-border)] hover:bg-[var(--color-surface-hi)]',
        className,
      )}
      {...rest}
    >
      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-2)] font-mono text-[12px] font-bold uppercase text-[var(--color-text)]">
        {code}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-[var(--color-text)]">
        {label}
      </span>
      {level ? (
        <span className="shrink-0 font-mono text-[12px] text-[var(--color-text-dim)]">{level}</span>
      ) : null}
      {selected ? <Icon.Check size={16} className="shrink-0 text-[var(--color-accent)]" /> : null}
    </button>
  ),
);
LanguageTile.displayName = 'LanguageTile';
