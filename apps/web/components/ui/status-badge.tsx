import { cn } from '@/lib/cn';
import * as React from 'react';

export type CampaignStatus =
  | 'draft'
  | 'pending'
  | 'paid'
  | 'running'
  | 'searching'
  | 'applying'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface StatusMeta {
  readonly label: string;
  readonly color: string;
  readonly dot: string;
}

export const STATUS_META: Readonly<Record<CampaignStatus, StatusMeta>> = {
  draft: { label: 'Черновик', color: 'var(--color-text-dim)', dot: 'var(--color-text-mute)' },
  pending: { label: 'Ожидает', color: 'var(--color-warn)', dot: 'var(--color-warn)' },
  paid: { label: 'Оплачено', color: 'var(--color-accent)', dot: 'var(--color-accent)' },
  running: { label: 'В работе', color: 'var(--color-accent)', dot: 'var(--color-accent)' },
  searching: { label: 'Ищем', color: 'var(--color-accent)', dot: 'var(--color-accent)' },
  applying: { label: 'Подаём', color: 'var(--color-accent)', dot: 'var(--color-accent)' },
  completed: { label: 'Готово', color: 'var(--color-success)', dot: 'var(--color-success)' },
  failed: { label: 'Ошибка', color: 'var(--color-danger)', dot: 'var(--color-danger)' },
  cancelled: { label: 'Отменено', color: 'var(--color-text-mute)', dot: 'var(--color-text-mute)' },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: CampaignStatus;
  label?: string;
}

export const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, label, className, ...rest }, ref) => {
    const meta = STATUS_META[status];
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex min-w-0 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-bg-2)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wider',
          className,
        )}
        style={{ color: meta.color }}
        {...rest}
      >
        <span
          aria-hidden
          className="inline-block size-1.5 shrink-0 rounded-full"
          style={{ background: meta.dot }}
        />
        <span className="min-w-0 truncate">{label ?? meta.label}</span>
      </span>
    );
  },
);
StatusBadge.displayName = 'StatusBadge';
