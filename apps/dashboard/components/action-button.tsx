'use client';

import { useTransition } from 'react';

type Props = {
  label: string;
  loadingLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'default';
  action: () => Promise<{ ok: boolean; error?: string }>;
  onDone?: (result: { ok: boolean; error?: string }) => void;
  disabled?: boolean;
};

const variantClass: Record<NonNullable<Props['variant']>, string> = {
  danger: 'bg-red-900/40 text-red-400 hover:bg-red-900/60 border-red-800',
  warning: 'bg-amber-900/40 text-amber-400 hover:bg-amber-900/60 border-amber-800',
  primary: 'bg-blue-900/40 text-blue-400 hover:bg-blue-900/60 border-blue-800',
  default: 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border-zinc-700',
};

export function ActionButton({
  label,
  loadingLabel,
  variant = 'default',
  action,
  onDone,
  disabled,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await action();
      onDone?.(result);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending || disabled}
      className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${variantClass[variant]}`}
    >
      {isPending ? (loadingLabel ?? '…') : label}
    </button>
  );
}
