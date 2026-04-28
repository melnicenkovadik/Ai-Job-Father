'use client';

import { cancelCampaign, forceTick, resetSimulator } from '@/lib/actions/campaigns';
import type { ActionResult } from '@/lib/actions/campaigns';
import { useState } from 'react';

type Props = {
  campaignId: string;
  status: string;
  hasSimulator: boolean;
};

export function CampaignControls({ campaignId, status, hasSimulator }: Props) {
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; message: string } | null>(null);

  async function run(action: () => Promise<ActionResult>, label: string) {
    setFeedback(null);
    const result = await action();
    if (result.ok) {
      setFeedback({ type: 'ok', message: `${label}: done` });
    } else {
      setFeedback({ type: 'error', message: result.error ?? 'Unknown error' });
    }
  }

  const canCancel = ['draft', 'paid', 'searching', 'applying'].includes(status);
  const canTick = ['paid', 'searching', 'applying'].includes(status);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-zinc-300">Controls</h3>
      <div className="flex flex-wrap gap-2">
        <CtrlButton
          label="Cancel campaign"
          variant="danger"
          disabled={!canCancel}
          confirm
          onConfirmed={() => run(() => cancelCampaign(campaignId), 'Cancel')}
        />
        <CtrlButton
          label="Force tick"
          variant="warning"
          disabled={!canTick}
          onConfirmed={() => run(() => forceTick(campaignId), 'Force tick')}
        />
        <CtrlButton
          label="Reset simulator"
          variant="warning"
          disabled={!hasSimulator}
          confirm
          onConfirmed={() => run(() => resetSimulator(campaignId), 'Reset simulator')}
        />
      </div>
      {feedback && (
        <p className={`text-xs ${feedback.type === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}

function CtrlButton({
  label,
  variant,
  disabled,
  confirm: needsConfirm,
  onConfirmed,
}: {
  label: string;
  variant: 'danger' | 'warning' | 'default';
  disabled?: boolean;
  confirm?: boolean;
  onConfirmed: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  const baseClass = {
    danger: 'border-red-800 bg-red-900/40 text-red-400 hover:bg-red-900/60',
    warning: 'border-amber-800 bg-amber-900/40 text-amber-400 hover:bg-amber-900/60',
    default: 'border-zinc-700 bg-zinc-800 text-zinc-300 hover:bg-zinc-700',
  }[variant];

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-zinc-400">{label}?</span>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onConfirmed();
          }}
          className={`rounded border px-2 py-1 text-xs font-medium ${baseClass}`}
        >
          Yes
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => (needsConfirm ? setConfirming(true) : onConfirmed())}
      className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-30 ${baseClass}`}
    >
      {label}
    </button>
  );
}
