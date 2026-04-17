'use client';

import { Stack } from '@/components/ui/layout';
import { authedFetch } from '@/lib/http/authed-fetch';
import type { ParsedResume } from '@ai-job-bot/core';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

interface UploadCvButtonProps {
  onParsed(parsed: ParsedResume): void;
}

interface SuccessBanner {
  readonly kind: 'success';
  readonly filled: number;
  readonly total: number;
  readonly parsed: ParsedResume;
}
interface ErrorBanner {
  readonly kind: 'error';
  readonly code: string;
}

type Banner = SuccessBanner | ErrorBanner;

const SUCCESS_DISMISS_MS = 4000;
const ACCEPTED_ERROR_CODES = new Set([
  'format',
  'file_too_large',
  'invalid_mime',
  'missing_file',
  'empty_file',
  'rate_limit',
  'unavailable',
]);

class UploadError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'UploadError';
  }
}

/**
 * Inline upload button + file picker + status banner (success / error).
 * Heuristic-tier parser is called; success → `onParsed` fires and the parent
 * merges the `ParsedResume` into the draft.
 */
export function UploadCvButton({ onParsed }: UploadCvButtonProps) {
  const t = useTranslations('profile.upload');
  const inputRef = useRef<HTMLInputElement>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const mutation = useMutation<ParsedResume, UploadError, File>({
    mutationFn: async (file) => {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authedFetch('/api/profile/parse-resume', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new UploadError(body.error ?? 'internal');
      }
      return (await res.json()) as ParsedResume;
    },
    onSuccess: (parsed) => {
      onParsed(parsed);
      const filled = countFilledFromParsed(parsed);
      setBanner({ kind: 'success', filled, total: 12, parsed });
    },
    onError: (err) => {
      setBanner({ kind: 'error', code: err.code });
    },
  });

  useEffect(() => {
    if (banner?.kind !== 'success') return;
    const timer = setTimeout(() => setBanner(null), SUCCESS_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [banner]);

  return (
    <Stack gap={2}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={mutation.isPending}
        className="inline-flex min-h-[2.75rem] w-full items-center justify-center rounded-lg bg-[var(--color-button,#2481CC)] px-4 text-sm font-medium text-[var(--color-button-text,#ffffff)] disabled:opacity-60"
      >
        {mutation.isPending ? `⏳ ${t('parsing')}` : t('label')}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          if (file) mutation.mutate(file);
          e.currentTarget.value = '';
        }}
      />
      {banner?.kind === 'success' && (
        <output className="block rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300 [overflow-wrap:anywhere]">
          ✓ {t('success', { filled: banner.filled, total: banner.total })}
          <details className="mt-2 text-xs opacity-80">
            <summary className="cursor-pointer">debug · what the parser returned</summary>
            <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-black/10 p-2 text-[11px] leading-snug">
              {JSON.stringify(banner.parsed, null, 2)}
            </pre>
          </details>
        </output>
      )}
      {banner?.kind === 'error' && (
        <p
          role="alert"
          className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 [overflow-wrap:anywhere]"
        >
          {t(`error.${resolveErrorCode(banner.code)}`)}
        </p>
      )}
    </Stack>
  );
}

function resolveErrorCode(code: string): string {
  return ACCEPTED_ERROR_CODES.has(code) ? code : 'internal';
}

function countFilledFromParsed(p: ParsedResume): number {
  const checks = [
    Boolean(p.fullName),
    Boolean(p.email),
    Boolean(p.phone),
    Boolean(p.location),
    Boolean(p.linkedinUrl ?? p.githubUrl ?? p.portfolioUrl),
    Boolean(p.headline),
    Boolean(p.summary),
    p.yearsTotal !== undefined,
    p.englishLevel !== undefined,
    p.skills.length > 0,
    p.experience.length > 0,
    p.languages.length > 0,
  ];
  return checks.filter(Boolean).length;
}
