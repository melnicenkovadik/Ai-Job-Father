import { StatusBadge } from '@/components/badge';
import { formatRelative } from '@/lib/format';
import { type OverviewData, getOverview } from '@/lib/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function OverviewPage() {
  const data = await getOverview();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="mt-1 text-sm text-zinc-500">Live snapshot · refreshes on every request</p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Users" value={data.users} />
        <MetricCard label="Active campaigns" value={data.activeCampaigns} />
        <MetricCard label="Paid (ever)" value={data.paidCampaigns} />
        <MetricCard label="⭐ Stars" value={data.starsRevenue.toLocaleString()} />
        <MetricCard label="TON" value={data.tonRevenue.toFixed(2)} />
        <MetricCard
          label="Errors (24h)"
          value={data.errors24h}
          accent={data.errors24h > 0 ? 'danger' : undefined}
        />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Recent campaigns" href="/campaigns" />
        <RecentCampaigns rows={data.recentCampaigns} />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Recent payments" href="/payments" />
        <RecentPayments rows={data.recentPayments} />
      </section>

      <section className="space-y-3">
        <SectionHeader title="Recent errors" href="/logs?level=error" />
        <RecentErrors rows={data.recentErrors} />
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: 'danger' | undefined;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p
        className={`mt-2 font-mono text-2xl font-bold ${
          accent === 'danger' ? 'text-red-400' : 'text-zinc-100'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-semibold">{title}</h2>
      <Link href={href as never} className="text-xs text-zinc-500 hover:text-zinc-300">
        View all →
      </Link>
    </div>
  );
}

function RecentCampaigns({ rows }: { rows: OverviewData['recentCampaigns'] }) {
  if (rows.length === 0) {
    return <EmptyState message="No campaigns yet." />;
  }
  return (
    <Table>
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
        {rows.map((r) => (
          <tr key={r.id} className="transition-colors hover:bg-zinc-900/60">
            <td className="px-4 py-2">
              <Link
                href={`/campaigns/${r.id}` as never}
                className="text-zinc-100 hover:text-amber-400"
              >
                {r.title}
              </Link>
            </td>
            <td className="px-4 py-2">
              <StatusBadge status={r.status} />
            </td>
            <td className="px-4 py-2 text-zinc-400">{r.category}</td>
            <td className="px-4 py-2 text-right font-mono text-zinc-300">{r.price_amount_cents}</td>
            <td className="px-4 py-2 text-right text-zinc-500">{formatRelative(r.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function RecentPayments({ rows }: { rows: OverviewData['recentPayments'] }) {
  if (rows.length === 0) {
    return <EmptyState message="No payments yet." />;
  }
  return (
    <Table>
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
        {rows.map((r) => (
          <tr key={r.id} className="transition-colors hover:bg-zinc-900/60">
            <td className="px-4 py-2">
              <Link
                href={`/payments/${r.id}` as never}
                className="text-zinc-100 hover:text-amber-400"
              >
                {r.provider}
              </Link>
            </td>
            <td className="px-4 py-2">
              <StatusBadge status={r.status} />
            </td>
            <td className="px-4 py-2 text-right font-mono text-zinc-300">
              {String(r.amount_provider)}
            </td>
            <td className="px-4 py-2 text-right text-zinc-400">{r.currency}</td>
            <td className="px-4 py-2 text-right text-zinc-500">{formatRelative(r.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function RecentErrors({ rows }: { rows: OverviewData['recentErrors'] }) {
  if (rows.length === 0) {
    return <EmptyState message="No errors in the last 24h. ✓" />;
  }
  return (
    <Table>
      <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
        <tr>
          <th className="px-4 py-2 text-left">Context</th>
          <th className="px-4 py-2 text-left">Message</th>
          <th className="px-4 py-2 text-right">When</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-800">
        {rows.map((r) => (
          <tr key={r.id} className="transition-colors hover:bg-zinc-900/60">
            <td className="px-4 py-2 font-mono text-xs text-zinc-400">{r.context ?? '—'}</td>
            <td className="px-4 py-2 text-zinc-200">{r.message}</td>
            <td className="px-4 py-2 text-right text-zinc-500">{formatRelative(r.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
      {message}
    </div>
  );
}
