'use client';

import { forceTick, resetSimulator } from '@/lib/actions/campaigns';
import type { ActionResult } from '@/lib/actions/campaigns';
import { useState } from 'react';

type Props = {
  campaignId: string;
  hasSimulator: boolean;
};

export function SimulatorRowActions({ campaignId, hasSimulator }: Props) {
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; msg: string } | null>(null);

  async function run(action: () => Promise<ActionResult>, label: string) {
    setFeedback(null);
    const r = await action();
    setFeedback({
      type: r.ok ? 'ok' : 'error',
      msg: r.ok ? label : 'error' in r ? r.error : 'Error',
    });
    if (r.ok) setTimeout(() => setFeedback(null), 3000);
  }

  return (
    <td className="px-4 py-3 text-right">
      <div className="flex items-center justify-end gap-2">
        {feedback && (
          <span className={`text-xs ${feedback.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
            {feedback.msg}
          </span>
        )}
        <button
          type="button"
          onClick={() => run(() => forceTick(campaignId), 'Ticked')}
          className="rounded border border-amber-800 bg-amber-900/30 px-2 py-1 text-xs text-amber-400 hover:bg-amber-900/50"
        >
          Force tick
        </button>
        {hasSimulator && (
          <button
            type="button"
            onClick={() => run(() => resetSimulator(campaignId), 'Reset')}
            className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-red-800 hover:text-red-400"
          >
            Reset
          </button>
        )}
      </div>
    </td>
  );
}
