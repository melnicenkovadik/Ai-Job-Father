'use client';

import { Stack } from '@/components/ui/layout';
import { openStarsInvoice } from '@/features/payment/use-payments';
import type { ResumeMeta } from '@/features/profile/types';
import { authedFetch } from '@/lib/http/authed-fetch';
import type { ParsedResume } from '@ai-job-bot/core';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface ReparseWithAiButtonProps {
  /** Profile id to re-parse — must already have `resumeStoragePath` set. */
  readonly profileId: string;
  /** Fires after a successful AI parse. Parent merges into the draft. */
  onParsed(parsed: ParsedResume, meta: ResumeMeta): void;
}

type Phase = 'idle' | 'paying' | 'parsing' | 'error';

interface ErrorBanner {
  readonly kind: 'error';
  readonly code: string;
}
interface SuccessBanner {
  readonly kind: 'success';
}
type Banner = ErrorBanner | SuccessBanner;

const SUCCESS_DISMISS_MS = 4000;

/**
 * Stars-paid AI re-parse from the existing storage object. No re-upload.
 *
 * Flow: ai-init → openInvoice → on `paid` POST JSON `{ profileId }` to
 * `/api/profile/parse-resume/ai` → server downloads the PDF from Storage,
 * runs OpenAI, returns the parsed resume + new metadata.
 *
 * If the user already has an unconsumed credit (the init endpoint reports
 * `alreadyHasCredit`), we skip the invoice and call the parse directly.
 */
export function ReparseWithAiButton({ profileId, onParsed }: ReparseWithAiButtonProps) {
  const t = useTranslations('profile.aiReparse');
  const [phase, setPhase] = useState<Phase>('idle');
  const [aiPriceStars, setAiPriceStars] = useState<number | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  const parseMutation = useMutation<ParsedResume & ResumeMeta, Error, void>({
    mutationFn: async () => {
      const res = await authedFetch('/api/profile/parse-resume/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'internal');
      }
      return (await res.json()) as ParsedResume & ResumeMeta;
    },
    onSuccess: (response) => {
      const { resumeStoragePath, resumeFileHash, resumeParsedAt, resumeParseModel, ...parsed } =
        response;
      const meta: ResumeMeta = {
        ...(resumeStoragePath !== undefined ? { resumeStoragePath } : {}),
        ...(resumeFileHash !== undefined ? { resumeFileHash } : {}),
        ...(resumeParsedAt !== undefined ? { resumeParsedAt } : {}),
        ...(resumeParseModel !== undefined ? { resumeParseModel } : {}),
      };
      onParsed(parsed, meta);
      setPhase('idle');
      setBanner({ kind: 'success' });
    },
    onError: (err) => {
      setPhase('error');
      setBanner({ kind: 'error', code: err.message });
    },
  });

  useEffect(() => {
    if (banner?.kind !== 'success') return;
    const timer = setTimeout(() => setBanner(null), SUCCESS_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [banner]);

  const onClick = async () => {
    setBanner(null);
    setPhase('paying');
    try {
      const initRes = await authedFetch('/api/profile/parse-resume/ai-init', { method: 'POST' });
      if (!initRes.ok) {
        setPhase('error');
        setBanner({ kind: 'error', code: 'aiPaymentFailed' });
        return;
      }
      const data = (await initRes.json()) as {
        invoiceLink?: string;
        starsAmount?: number;
        alreadyHasCredit?: boolean;
      };
      if (data.starsAmount) setAiPriceStars(data.starsAmount);
      if (data.alreadyHasCredit) {
        setPhase('parsing');
        parseMutation.mutate();
        return;
      }
      if (!data.invoiceLink) {
        setPhase('error');
        setBanner({ kind: 'error', code: 'aiPaymentFailed' });
        return;
      }
      const status = await openStarsInvoice(data.invoiceLink);
      if (status === 'paid') {
        setPhase('parsing');
        // Slight delay so the bot's successful_payment handler can insert the
        // credit row before the parse endpoint checks for it.
        setTimeout(() => parseMutation.mutate(), 500);
        return;
      }
      setPhase('error');
      setBanner({
        kind: 'error',
        code: status === 'cancelled' ? 'aiPaymentCancelled' : 'aiPaymentFailed',
      });
    } catch {
      setPhase('error');
      setBanner({ kind: 'error', code: 'aiPaymentFailed' });
    }
  };

  const busy = phase === 'paying' || phase === 'parsing' || parseMutation.isPending;

  return (
    <Stack gap={2}>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="inline-flex min-h-[2.75rem] w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent-bg)] px-4 text-sm font-semibold text-[var(--color-accent)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <span className="min-w-0 truncate">
          {phase === 'paying'
            ? t('busyPay')
            : phase === 'parsing'
              ? t('busyParse')
              : t('label', { amount: aiPriceStars ?? 5 })}
        </span>
      </button>
      <p className="text-[12px] text-[var(--color-text-mute)]">{t('hint')}</p>
      {banner?.kind === 'success' && (
        <output className="block rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-300 [overflow-wrap:anywhere]">
          ✓ {t('success')}
        </output>
      )}
      {banner?.kind === 'error' && (
        <p
          role="alert"
          className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300 [overflow-wrap:anywhere]"
        >
          {resolveErrorMessage(t, banner.code)}
        </p>
      )}
    </Stack>
  );
}

function resolveErrorMessage(t: ReturnType<typeof useTranslations>, code: string): string {
  if (code === 'aiPaymentCancelled') return t('errorCancelled');
  if (code === 'aiPaymentFailed') return t('errorPayment');
  if (code === 'no_credit') return t('errorPayment');
  if (code === 'no_resume_in_storage') return t('errorNoPdf');
  if (code === 'profile_not_found') return t('errorNotFound');
  if (code === 'storage_download_failed') return t('errorDownload');
  return t('errorGeneric');
}
