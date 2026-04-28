import { StatusBadge } from '@/components/badge';
import { formatRelative, formatTime, truncateId } from '@/lib/format';
import { getUserDetail } from '@/lib/queries';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DeleteProfileButton } from './delete-profile-button';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getUserDetail(id);
  if (!data) notFound();

  const { user, profiles, campaigns, payments, settings, logs } = data;
  const displayName = [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/users" className="text-sm text-zinc-500 hover:text-zinc-300">
              ← Users
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold">{displayName}</h1>
          {user.username && <p className="text-sm text-zinc-500">@{user.username}</p>}
        </div>
        <div className="text-right text-xs text-zinc-500">
          <p>TG ID: {user.telegram_id}</p>
          <p>Joined {formatTime(user.created_at)}</p>
          {user.locale && <p>Locale: {user.locale}</p>}
          {user.is_premium && <p className="text-amber-400">⭐ Premium</p>}
        </div>
      </header>

      {/* Profiles */}
      <section id="profiles" className="space-y-3">
        <h2 className="text-lg font-semibold">Profiles</h2>
        {profiles.length === 0 ? (
          <Empty message="No profiles." />
        ) : (
          <div className="space-y-3">
            {profiles.map((p) => (
              <div key={p.id} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-medium text-zinc-100">{p.name}</span>
                    {p.is_default && (
                      <span className="ml-2 rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-300">
                        default
                      </span>
                    )}
                    {p.full_name && (
                      <span className="ml-2 text-sm text-zinc-400">{p.full_name}</span>
                    )}
                  </div>
                  <DeleteProfileButton profileId={p.id} userId={id} />
                </div>
                <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                  {p.email && <span>{p.email}</span>}
                  {p.headline && <span className="truncate">{p.headline}</span>}
                  {p.years_total != null && <span>{p.years_total} yrs</span>}
                  {p.resume_parsed_at && (
                    <span>CV parsed {formatRelative(p.resume_parsed_at)}</span>
                  )}
                </div>
                <p className="mt-1 font-mono text-xs text-zinc-600">{truncateId(p.id, 12)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Campaigns */}
      <section id="campaigns" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Campaigns</h2>
          <Link
            href={`/campaigns?userId=${id}`}
            className="text-xs text-zinc-500 hover:text-zinc-300"
          >
            View all →
          </Link>
        </div>
        {campaigns.length === 0 ? (
          <Empty message="No campaigns." />
        ) : (
          <TableWrap>
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Price (¢)</th>
                <th className="px-4 py-2 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-900/60">
                  <td className="px-4 py-2">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-zinc-100 hover:text-amber-400"
                    >
                      {c.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2 text-zinc-400">{c.category}</td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-300">
                    {c.price_amount_cents}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-500">
                    {formatRelative(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      {/* Payments */}
      <section id="payments" className="space-y-3">
        <h2 className="text-lg font-semibold">Payments</h2>
        {payments.length === 0 ? (
          <Empty message="No payments." />
        ) : (
          <TableWrap>
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">Provider</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-right">Currency</th>
                <th className="px-4 py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-900/60">
                  <td className="px-4 py-2">
                    <Link href={`/payments/${p.id}`} className="text-zinc-100 hover:text-amber-400">
                      {p.provider}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-300">
                    {String(p.amount_provider)}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-400">{p.currency}</td>
                  <td className="px-4 py-2 text-right text-zinc-500">
                    {formatRelative(p.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>

      {/* Settings */}
      <section id="settings" className="space-y-3">
        <h2 className="text-lg font-semibold">Settings</h2>
        {settings ? (
          <SettingsForm settings={settings} userId={id} />
        ) : (
          <Empty message="No settings row (auto-creates on next login)." />
        )}
      </section>

      {/* Logs */}
      <section id="logs" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent logs</h2>
          <Link href={`/logs?userId=${id}`} className="text-xs text-zinc-500 hover:text-zinc-300">
            View all →
          </Link>
        </div>
        {logs.length === 0 ? (
          <Empty message="No logs for this user." />
        ) : (
          <TableWrap>
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">Level</th>
                <th className="px-4 py-2 text-left">Context</th>
                <th className="px-4 py-2 text-left">Message</th>
                <th className="px-4 py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-zinc-900/60">
                  <td className="px-4 py-2">
                    <StatusBadge status={l.level} />
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">{l.context ?? '—'}</td>
                  <td className="px-4 py-2 text-zinc-200">{l.message}</td>
                  <td className="px-4 py-2 text-right text-zinc-500">
                    {formatRelative(l.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </section>
    </div>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-4 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}
