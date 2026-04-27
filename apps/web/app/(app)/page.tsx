'use client';

import { DashboardScreen } from '@/features/dashboard/dashboard-screen';
import { useSession } from '@/lib/auth/use-session';
import { useMockStore } from '@/lib/mocks/store';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useShallow } from 'zustand/shallow';

export default function HomePage() {
  const t = useTranslations('home');
  const session = useSession();
  const router = useRouter();
  const { hasOnboarded, hasCampaigns } = useMockStore(
    useShallow((s) => ({
      hasOnboarded: s.settings.hasOnboarded,
      hasCampaigns: s.campaignOrder.length > 0,
    })),
  );

  useEffect(() => {
    if (!hasOnboarded && !hasCampaigns) {
      router.replace('/onboarding');
    }
  }, [hasOnboarded, hasCampaigns, router]);

  const name = session?.user.firstName ?? session?.user.username ?? t('fallbackName');
  return <DashboardScreen greetingName={name} />;
}
