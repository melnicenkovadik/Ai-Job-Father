'use client';

import { sendBroadcast } from '@/lib/actions/broadcast';
import { useState } from 'react';

type Props = { allUserIds: string[] };

export function BroadcastForm({ allUserIds }: Props) {
  const [toAll, setToAll] = useState(false);
  const [manualIds, setManualIds] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<
    'idle' | 'sending' | { sent: number; failed: number; errors: string[] }
  >('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    const ids = toAll
      ? allUserIds
      : manualIds
          .split(/[\n,]+/)
          .map((s) => s.trim())
          .filter(Boolean);

    if (ids.length === 0) return;

    setState('sending');
    const result = await sendBroadcast(ids, message.trim());
    setState(result);
  }

  const isSending = state === 'sending';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Recipient selection */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={toAll}
            onChange={(e) => setToAll(e.target.checked)}
            className="h-4 w-4 rounded accent-amber-400"
          />
          Send to all {allUserIds.length} users
        </label>

        {!toAll && (
          <div>
            <label htmlFor="broadcast-ids" className="mb-1 block text-xs text-zinc-500">
              User IDs (one per line or comma-separated)
            </label>
            <textarea
              id="broadcast-ids"
              value={manualIds}
              onChange={(e) => setManualIds(e.target.value)}
              rows={4}
              placeholder="uuid1&#10;uuid2&#10;uuid3"
              className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 font-mono text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            />
          </div>
        )}
      </div>

      {/* Message */}
      <div>
        <label htmlFor="broadcast-message" className="mb-1 block text-xs text-zinc-500">
          Message (HTML supported)
        </label>
        <textarea
          id="broadcast-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          required
          placeholder="Hello! We have an update for you..."
          className="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSending || !message.trim()}
        className="rounded border border-zinc-600 bg-zinc-700 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-600 disabled:opacity-40"
      >
        {isSending ? 'Sending…' : 'Send broadcast'}
      </button>

      {typeof state === 'object' && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            state.failed > 0
              ? 'border-amber-800 bg-amber-900/20 text-amber-300'
              : 'border-green-800 bg-green-900/20 text-green-300'
          }`}
        >
          <p>
            Sent: {state.sent} · Failed: {state.failed}
          </p>
          {state.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-red-400">
              {state.errors.slice(0, 10).map((e) => (
                <li key={e}>{e}</li>
              ))}
              {state.errors.length > 10 && <li>…and {state.errors.length - 10} more</li>}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
