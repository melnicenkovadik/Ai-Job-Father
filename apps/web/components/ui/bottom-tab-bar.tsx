'use client';

import { Icon } from '@/components/icons';
import { cn } from '@/lib/cn';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type * as React from 'react';

interface TabConfig {
  readonly key: 'dashboard' | 'profiles' | 'settings';
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly match: (pathname: string) => boolean;
}

const TABS: readonly TabConfig[] = [
  {
    key: 'dashboard',
    href: '/',
    icon: <Icon.Search size={22} />,
    match: (p) => p === '/' || p.startsWith('/campaign'),
  },
  {
    key: 'profiles',
    href: '/profiles',
    icon: <Icon.User size={22} />,
    match: (p) => p.startsWith('/profile'),
  },
  {
    key: 'settings',
    href: '/settings',
    icon: <Icon.Settings size={22} />,
    match: (p) => p.startsWith('/settings'),
  },
];

export function BottomTabBar({ className }: { className?: string }) {
  const t = useTranslations('nav');
  const pathname = usePathname() ?? '/';
  return (
    <nav
      aria-label={t('aria')}
      className={cn(
        /* layout-safe: persistent bottom navigation; <Screen reserveBottomTab> compensates with padding. */
        'fixed inset-x-0 bottom-0 z-20 flex min-w-0 items-stretch justify-around border-t border-[var(--color-border)] bg-[var(--color-bg-2)]/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur',
        className,
      )}
    >
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={cn(
              'flex min-h-[2.75rem] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors',
              active ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-mute)]',
            )}
            aria-current={active ? 'page' : undefined}
          >
            <span className="shrink-0">{tab.icon}</span>
            <span className="truncate">{t(tab.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
