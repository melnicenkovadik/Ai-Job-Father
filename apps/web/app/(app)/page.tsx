'use client';

import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { useSettingsQuery } from '@/features/settings/use-settings';
import { useSession } from '@/lib/auth/use-session';
import { useMockStore } from '@/lib/mocks/store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const t = useTranslations('home');
  const session = useSession();
  const router = useRouter();
  const { data: settings, isLoading: settingsLoading } = useSettingsQuery();
  // Wave B will replace this with `useCampaignsQuery` and lift the gate fully off the mock store.
  const hasCampaigns = useMockStore((s) => s.campaignOrder.length > 0);

  useEffect(() => {
    if (settingsLoading) return;
    if (!settings?.hasOnboarded && !hasCampaigns) {
      router.replace('/onboarding');
    }
  }, [settings?.hasOnboarded, hasCampaigns, settingsLoading, router]);

  const name = session?.user.firstName ?? session?.user.username ?? t('fallbackName');
  return <DashboardScreen greetingName={name} />;
}
