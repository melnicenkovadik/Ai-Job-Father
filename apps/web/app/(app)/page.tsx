'use client';

import { Screen, Stack } from '@/components/ui/layout';
import { useSession } from '@/lib/auth/use-session';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function HomePage() {
  const t = useTranslations('home');
  const tProfile = useTranslations('profile');
  const session = useSession();
  const name = session?.user.firstName ?? session?.user.username ?? t('fallbackName');

  return (
    <Screen>
      <Stack gap={4} className="flex-1 justify-center px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold [overflow-wrap:anywhere]">
          {t('greeting', { name })}
        </h1>
        <p className="text-sm opacity-70 [overflow-wrap:anywhere]">{t('description')}</p>
        <Link
          href="/profile"
          className="mx-auto inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-[var(--color-button,#2481CC)] px-6 text-sm font-medium text-[var(--color-button-text,#ffffff)]"
        >
          👤 {tProfile('title')}
        </Link>
        <p className="mt-2 text-xs opacity-50 [overflow-wrap:anywhere]">{t('phaseNote')}</p>
      </Stack>
    </Screen>
  );
}
