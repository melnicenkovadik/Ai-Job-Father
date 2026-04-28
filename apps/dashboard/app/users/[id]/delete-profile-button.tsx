'use client';

import { deleteProfile } from '@/lib/actions/profiles';
import { useState } from 'react';

export function DeleteProfileButton({
  profileId,
  userId,
}: {
  profileId: string;
  userId: string;
}) {
  const [state, setState] = useState<'idle' | 'confirm' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  if (state === 'confirm') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-400">Delete profile?</span>
        <button
          type="button"
          onClick={async () => {
            setState('loading');
            const result = await deleteProfile(profileId, userId);
            if (result.ok) {
              // page will revalidate
            } else {
              setError(result.error ?? 'Unknown error');
              setState('error');
            }
          }}
          className="rounded border border-red-800 bg-red-900/40 px-2 py-1 text-xs text-red-400 hover:bg-red-900/60"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setState('idle')}
          className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    );
  }

  if (state === 'error') {
    return <span className="text-xs text-red-400">{error}</span>;
  }

  return (
    <button
      type="button"
      disabled={state === 'loading'}
      onClick={() => setState('confirm')}
      className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-500 hover:border-red-800 hover:text-red-400 disabled:opacity-40"
    >
      {state === 'loading' ? '…' : 'Delete'}
    </button>
  );
}
