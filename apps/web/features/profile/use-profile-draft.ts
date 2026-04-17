'use client';

import type { ProfileDto } from '@/lib/profile/schema';
import { useCallback, useMemo, useState } from 'react';
import { type ProfileDraft, dtoToDraft } from './types';

/**
 * Client-side profile form state. One hook per page instance.
 *
 * Returns the draft + setters + dirty flag. `reset(dto)` is called after a
 * successful save to re-baseline the "initial" snapshot and clear the
 * dirty bit; `replace(draft)` swaps the whole draft (used after resume
 * upload merges).
 */
export function useProfileDraft(initialDto: ProfileDto | null): UseProfileDraftResult {
  const [initialDraft, setInitialDraft] = useState<ProfileDraft>(() => dtoToDraft(initialDto));
  const [draft, setDraft] = useState<ProfileDraft>(() => dtoToDraft(initialDto));

  const replace = useCallback((next: ProfileDraft) => {
    setDraft(next);
  }, []);

  const patch = useCallback(<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback((dto: ProfileDto | null) => {
    const next = dtoToDraft(dto);
    setInitialDraft(next);
    setDraft(next);
  }, []);

  const discard = useCallback(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const isDirty = useMemo(() => !draftsEqual(draft, initialDraft), [draft, initialDraft]);
  const isValid = useMemo(() => draft.name.trim().length > 0, [draft.name]);

  return { draft, setDraft, replace, patch, reset, discard, isDirty, isValid };
}

export interface UseProfileDraftResult {
  readonly draft: ProfileDraft;
  setDraft(next: ProfileDraft): void;
  replace(next: ProfileDraft): void;
  patch<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]): void;
  reset(dto: ProfileDto | null): void;
  discard(): void;
  readonly isDirty: boolean;
  readonly isValid: boolean;
}

function draftsEqual(a: ProfileDraft, b: ProfileDraft): boolean {
  // Fast path: compare serialised JSON. Draft shapes are plain objects, no
  // Dates / Maps. Cheap enough on every change for a single form.
  return JSON.stringify(a) === JSON.stringify(b);
}
