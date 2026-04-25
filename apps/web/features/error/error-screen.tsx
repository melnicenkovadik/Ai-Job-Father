'use client';

import { Icon } from '@/components/icons';
import { useTelegramBackButton } from '@/components/telegram/use-back-button';
import { Headline, MainButtonBinding } from '@/components/ui';
import { Screen, Scroll, Stack } from '@/components/ui/layout';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

interface ErrorScreenProps {
  title?: string;
  hint?: string;
  code?: string;
  detail?: string;
  onRetry?: () => void;
  ctaText?: string;
  ctaHref?: string;
}

export function ErrorScreen({
  title,
  hint,
  code,
  detail,
  onRetry,
  ctaText,
  ctaHref = '/',
}: ErrorScreenProps) {
  const t = useTranslations('screens.error');
  const router = useRouter();

  useTelegramBackButton(ctaHref);

  const headlineText = title ?? t('defaultTitle');
  const hintText = hint ?? t('defaultHint');
  const buttonText = ctaText ?? (onRetry ? t('retry') : t('home'));
  const handleClick = onRetry ?? (() => router.push(ctaHref));

  return (
    <Screen>
      <Scroll className="flex-1">
        <Stack gap={4} className="min-h-full items-center justify-center px-6 py-12 text-center">
          <div className="inline-flex size-20 items-center justify-center rounded-full bg-[var(--color-accent-bg)] text-[var(--color-accent)]">
            <Icon.Alert size={40} />
          </div>
          <Headline size="md" className="whitespace-pre-line text-center">
            {headlineText}
          </Headline>
          <p className="max-w-[260px] text-[14px] text-[var(--color-text-dim)]">{hintText}</p>
          {code ? (
            <div className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-left font-mono text-[11px] text-[var(--color-text-dim)]">
              <div>
                {t('codeLabel')} · {code}
              </div>
              {detail ? <div className="text-[var(--color-text-mute)]">{detail}</div> : null}
            </div>
          ) : null}
        </Stack>
      </Scroll>

      <MainButtonBinding text={buttonText} onClick={handleClick} />
    </Screen>
  );
}
