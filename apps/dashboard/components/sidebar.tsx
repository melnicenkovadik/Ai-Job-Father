'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Overview' },
  { href: '/users', label: 'Users' },
  { href: '/campaigns', label: 'Campaigns' },
  { href: '/payments', label: 'Payments' },
  { href: '/logs', label: 'Logs' },
  { href: '/simulator', label: 'Simulator' },
  { href: '/operations', label: 'Operations' },
] as const;

export function Sidebar() {
  const pathname = usePathname() ?? '/';

  return (
    <aside className="w-56 shrink-0 border-r border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-8">
        <h1 className="text-sm font-bold uppercase tracking-wider text-zinc-200">AI Job Father</h1>
        <p className="text-xs text-zinc-500">Operator Dashboard</p>
      </div>
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? 'bg-zinc-800 text-zinc-50'
                  : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
