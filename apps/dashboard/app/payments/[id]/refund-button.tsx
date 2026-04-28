'use client';

import { markRefunded } from '@/lib/actions/payments';
import { useState } from 'react';

export function RefundButton({ paymentId }: { paymentId: string }) {
  const [state, setState] = useState<'idle' | 'confirm' | 'loading' | 'done' | 'error'>('idle');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (state === 'done') {
    return <span className="text-xs text-green-400">Marked as refunded</span>;
  }

  if (state === 'confirm') {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-amber-800 bg-amber-900/20 p-3">
        <p className="text-xs text-amber-300">
          Mark this payment as refunded? (No actual refund will be issued — this is a manual record
          only.)
        </p>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional)"
          className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-zinc-100 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              setState('loading');
              const result = await markRefunded(paymentId, reason);
              if (result.ok) {
                setState('done');
              } else {
                setError(result.error ?? 'Unknown error');
                setState('error');
              }
            }}
            className="rounded border border-amber-800 bg-amber-900/40 px-3 py-1 text-xs text-amber-400 hover:bg-amber-900/60"
          >
            Confirm refund
          </button>
          <button
            type="button"
            onClick={() => setState('idle')}
            className="rounded border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={state === 'loading'}
      onClick={() => setState('confirm')}
      className="rounded border border-amber-800 bg-amber-900/40 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-900/60 disabled:opacity-40"
    >
      {state === 'loading' ? '…' : 'Mark as refunded'}
    </button>
  );
}
