'use client';

import { Icon } from '@/components/icons';
import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { Headline, MainButtonBinding, Spinner } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import { authedFetch } from '@/lib/http/authed-fetch';
import type { ParsedResume } from '@ai-job-bot/core';
import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'uploading' | 'parsing' | 'done' | 'error';

interface ProfileUploadScreenProps {
  initialPhase?: Phase;
  simulate?: boolean;
}

class UploadError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'UploadError';
  }
}

const ACCEPTED_ERROR_CODES = new Set([
  'format',
  'file_too_large',
  'invalid_mime',
  'missing_file',
  'empty_file',
  'rate_limit',
  'unavailable',
]);

export function ProfileUploadScreen({
  initialPhase = 'idle',
  simulate = false,
}: ProfileUploadScreenProps) {
  const t = useTranslations('screens.upload');
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>(initialPhase);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>(t('sampleFile'));
  const [fileSize, setFileSize] = useState<string>(t('sampleSize'));

  useTelegramBackButton('/profile');

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
    onMutate: () => {
      setPhase('uploading');
      setTimeout(() => setPhase((p) => (p === 'uploading' ? 'parsing' : p)), 800);
    },
    onSuccess: () => {
      setPhase('done');
      setTimeout(() => router.push('/profile'), 900);
    },
    onError: (err) => {
      setPhase('error');
      setErrorCode(err.code);
    },
  });

  useEffect(() => {
    if (!simulate) return;
    if (phase === 'idle' || phase === 'done' || phase === 'error') return;
    if (phase === 'uploading') {
      const timer = setTimeout(() => setPhase('parsing'), 1200);
      return () => clearTimeout(timer);
    }
    if (phase === 'parsing') {
      const timer = setTimeout(() => setPhase('done'), 2000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [phase, simulate]);

  const onPickFile = () => inputRef.current?.click();
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileSize(`${Math.round(file.size / 1024)} KB`);
      mutation.mutate(file);
    }
    e.currentTarget.value = '';
  };

  const isIdle = phase === 'idle';
  const isError = phase === 'error';

  return (
    <Screen reserveMainButton={isIdle}>
      <Scroll className="flex-1">
        <Stack gap={3} className="px-4 pb-4 pt-6">
          <Stack gap={1}>
            <Headline size="md">{t('title')}</Headline>
            <p className="text-[14px] text-[var(--color-text-dim)]">{t('subtitle')}</p>
          </Stack>

          {isIdle ? (
            <>
              <button
                type="button"
                onClick={onPickFile}
                className="rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border-hi)] bg-[var(--color-surface)] p-8 text-center transition-colors hover:border-[var(--color-accent)]"
              >
                <span className="mx-auto mb-4 inline-flex size-16 items-center justify-center rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)]">
                  <Icon.Upload size={28} />
                </span>
                <span className="block text-[15px] font-semibold text-[var(--color-text)]">
                  {t('dropzone')}
                </span>
                <span className="mt-1 block text-[12px] text-[var(--color-text-dim)]">
                  {t('fileTypes')}
                </span>
              </button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-[12px] text-[var(--color-text-mute)]">
                  {t('orSeparator')}
                </span>
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>

              <label className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 focus-within:border-[var(--color-accent)]">
                <Icon.Globe size={18} className="shrink-0 text-[var(--color-text-dim)]" />
                <input
                  type="url"
                  placeholder={t('linkedinPlaceholder')}
                  className="min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-text)] placeholder:text-[var(--color-text-mute)] focus:outline-none"
                  aria-label={t('linkedinPlaceholder')}
                />
              </label>
            </>
          ) : null}

          {!isIdle ? (
            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="mb-4 flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-bg-2)] p-3.5">
                <span className="inline-flex h-11 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-accent-bg)] text-[var(--color-accent)]">
                  <Icon.Doc size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-[var(--color-text)]">
                    {fileName}
                  </p>
                  <p className="truncate font-mono text-[12px] text-[var(--color-text-dim)]">
                    {fileSize}
                  </p>
                </div>
              </div>

              <Stack gap={2}>
                <UploadStep
                  label={t('step.upload')}
                  done={phase === 'parsing' || phase === 'done'}
                  active={phase === 'uploading'}
                />
                <UploadStep
                  label={t('step.extract')}
                  done={phase === 'done'}
                  active={phase === 'parsing'}
                />
                <UploadStep
                  label={t('step.ai')}
                  done={phase === 'done'}
                  active={phase === 'parsing'}
                />
                <UploadStep
                  label={t('step.profile')}
                  done={phase === 'done'}
                  active={phase === 'done'}
                />
              </Stack>

              {phase === 'parsing' ? (
                <div className="mt-4 flex min-w-0 items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-accent-bg)] px-3 py-2.5 text-[12px] text-[var(--color-accent)]">
                  <Icon.Spark size={14} className="shrink-0" />
                  <span className="min-w-0">{t('aiHint')}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {isError ? (
            <p
              role="alert"
              className="rounded-[var(--radius-md)] bg-[var(--color-danger)]/15 px-3 py-3 text-[13px] text-[var(--color-danger)]"
            >
              {t(`error.${resolveErrorCode(errorCode)}`)}
            </p>
          ) : null}
        </Stack>
      </Scroll>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={onFileChange}
      />

      {isIdle ? <MainButtonBinding text={t('mainCta')} onClick={onPickFile} /> : null}
      {phase === 'done' ? (
        <MainButtonBinding text={t('reviewCta')} onClick={() => router.push('/profile')} />
      ) : null}
      {isError ? (
        <MainButtonBinding text={t('errorRetry')} onClick={() => setPhase('idle')} />
      ) : null}
    </Screen>
  );
}

function UploadStep({
  label,
  done,
  active,
}: {
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full ${
          done
            ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
            : active
              ? 'bg-[var(--color-accent-bg)] text-[var(--color-accent)]'
              : 'border border-[var(--color-border)] bg-[var(--color-bg-2)] text-[var(--color-text-mute)]'
        }`}
      >
        {done ? <Icon.Check size={14} strokeWidth={3} /> : null}
        {active && !done ? <Spinner size={14} /> : null}
      </span>
      <span
        className={`text-[14px] ${
          done
            ? 'font-medium text-[var(--color-text)]'
            : active
              ? 'font-semibold text-[var(--color-accent)]'
              : 'text-[var(--color-text-mute)]'
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function resolveErrorCode(code: string | null): string {
  if (!code) return 'internal';
  return ACCEPTED_ERROR_CODES.has(code) ? code : 'internal';
}
