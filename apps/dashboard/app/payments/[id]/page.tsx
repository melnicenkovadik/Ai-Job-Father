import { StatusBadge } from '@/components/badge';
import { formatTime, truncateId } from '@/lib/format';
import { getPaymentDetail } from '@/lib/queries';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RefundButton } from './refund-button';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function PaymentDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getPaymentDetail(id);
  if (!data) notFound();

  const { payment: p, campaign } = data;
  const canRefund = p.status === 'succeeded';

  return (
    <div className="space-y-8">
      <header>
        <Link href="/payments" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Payments
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{p.provider.toUpperCase()} payment</h1>
            <p className="mt-1 font-mono text-xs text-zinc-500">{p.id}</p>
          </div>
          <StatusBadge status={p.status} />
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
          <h3 className="mb-3 text-sm font-semibold text-zinc-400">Details</h3>
          <dl className="space-y-2">
            <Row
              label="User"
              value={
                <Link href={`/users/${p.user_id}`} className="text-amber-400 hover:underline">
                  {truncateId(p.user_id)}
                </Link>
              }
            />
            {campaign && (
              <Row
                label="Campaign"
                value={
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="text-amber-400 hover:underline"
                  >
                    {campaign.title}
                  </Link>
                }
              />
            )}
            <Row label="Provider" value={p.provider} />
            <Row label="Amount" value={`${String(p.amount_provider)} ${p.currency}`} />
            <Row
              label="Charge ID"
              value={<span className="font-mono text-xs">{p.provider_charge_id ?? '—'}</span>}
            />
            <Row label="Created" value={formatTime(p.created_at)} />
            <Row label="Confirmed" value={p.confirmed_at ? formatTime(p.confirmed_at) : '—'} />
          </dl>
        </div>

        {canRefund && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
            <h3 className="mb-3 text-sm font-semibold text-zinc-400">Actions</h3>
            <RefundButton paymentId={p.id} />
          </div>
        )}
      </div>

      {/* Raw event */}
      {p.raw_event && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Raw event</h2>
          <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-300">
            {JSON.stringify(p.raw_event, null, 2)}
          </pre>
        </section>
      )}

      {/* Snapshot */}
      {p.snapshot_data && Object.keys(p.snapshot_data).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Snapshot</h2>
          <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-300">
            {JSON.stringify(p.snapshot_data, null, 2)}
          </pre>
        </section>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-right text-sm text-zinc-200">{value}</dd>
    </div>
  );
}
