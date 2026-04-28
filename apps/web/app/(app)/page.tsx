'use client';

import { useCampaignsQuery } from '@/features/campaigns/use-campaigns';
import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { useProfilesQuery } from '@/features/profiles-list/use-profiles';
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
  const { data: profiles, isLoading: profilesLoading } = useProfilesQuery();
  const hasCampaigns = (campaigns?.length ?? 0) > 0;
  const hasProfile = (profiles?.length ?? 0) > 0;

  useEffect(() => {
    if (settingsLoading || campaignsLoading || profilesLoading) return;
    // Three independent signals close the welcome gate. We need any one of
    // them — settings.hasOnboarded can be stale right after profile save,
    // and profiles is the most direct evidence the user already onboarded.
    if (!settings?.hasOnboarded && !hasCampaigns && !hasProfile) {
      router.replace('/onboarding');
    }
  }, [
    settings?.hasOnboarded,
    hasCampaigns,
    hasProfile,
    settingsLoading,
    campaignsLoading,
    profilesLoading,
    router,
  ]);

  const name = session?.user.firstName ?? session?.user.username ?? t('fallbackName');
  return <DashboardScreen greetingName={name} />;
}
