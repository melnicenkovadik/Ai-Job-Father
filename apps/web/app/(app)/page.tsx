'use client';

import { useCampaignsQuery } from '@/features/campaigns/use-campaigns';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { useSettingsQuery } from '@/features/settings/use-settings';
import { useSession } from '@/lib/auth/use-session';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const t = useTranslations('home');
  const session = useSession();
  const router = useRouter();
  const { data: settings, isLoading: settingsLoading } = useSettingsQuery();
  const { data: campaigns, isLoading: campaignsLoading } = useCampaignsQuery();
  const hasCampaigns = (campaigns?.length ?? 0) > 0;

  useEffect(() => {
    if (settingsLoading || campaignsLoading) return;
    if (!settings?.hasOnboarded && !hasCampaigns) {
      router.replace('/onboarding');
    }
  }, [settings?.hasOnboarded, hasCampaigns, settingsLoading, campaignsLoading, router]);

  const name = session?.user.firstName ?? session?.user.username ?? t('fallbackName');
  return <DashboardScreen greetingName={name} />;
}
