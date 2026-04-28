import { StatusBadge } from '@/components/badge';
import { formatCents, formatRelative, formatTime, truncateId } from '@/lib/format';
import { getCampaignDetail } from '@/lib/queries';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CampaignControls } from './campaign-controls';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export default async function CampaignDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getCampaignDetail(id);
  if (!data) notFound();

  const { campaign: c, simulatorState: sim, events, payment } = data;

  return (
    <div className="space-y-8">
      <header>
        <Link href="/campaigns" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Campaigns
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{c.title}</h1>
            <p className="mt-1 font-mono text-xs text-zinc-500">{c.id}</p>
          </div>
          <StatusBadge status={c.status} />
        </div>
      </header>

      {/* Controls */}
      <CampaignControls campaignId={c.id} status={c.status} hasSimulator={sim !== null} />

      {/* Snapshot */}
      <section className="grid gap-4 md:grid-cols-2">
        <InfoCard title="Details">
          <Row
            label="User"
            value={
              <Link href={`/users/${c.user_id}`} className="text-amber-400 hover:underline">
                {truncateId(c.user_id)}
              </Link>
            }
          />
          <Row label="Category" value={c.category} />
          <Row label="Quota" value={String(c.quota)} />
          <Row label="Countries" value={c.countries?.join(', ') || '—'} />
          <Row label="Price" value={formatCents(c.price_amount_cents)} />
        </InfoCard>

        <InfoCard title="Progress">
          <Row label="Found" value={String(c.progress_found)} />
          <Row label="Applied" value={String(c.progress_applied)} />
          <Row
            label="Last ticked"
            value={c.last_ticked_at ? formatRelative(c.last_ticked_at) : '—'}
          />
          <Row label="Paid at" value={c.paid_at ? formatTime(c.paid_at) : '—'} />
          <Row label="Started at" value={c.started_at ? formatTime(c.started_at) : '—'} />
          <Row label="Completed at" value={c.completed_at ? formatTime(c.completed_at) : '—'} />
        </InfoCard>

        {payment && (
          <InfoCard title="Payment">
            <Row
              label="ID"
              value={
                <Link href={`/payments/${payment.id}`} className="text-amber-400 hover:underline">
                  {truncateId(payment.id)}
                </Link>
              }
            />
            <Row label="Provider" value={payment.provider} />
            <Row label="Status" value={<StatusBadge status={payment.status} />} />
            <Row label="Amount" value={`${String(payment.amount_provider)} ${payment.currency}`} />
          </InfoCard>
        )}

        {sim && (
          <InfoCard title="Simulator state">
            <Row label="Ticks total" value={String(sim.ticks_total)} />
            <Row label="Ticks remaining" value={String(sim.ticks_remaining)} />
            <Row
              label="Plateau until"
              value={sim.plateau_until ? formatTime(sim.plateau_until) : '—'}
            />
            <Row
              label="Locked until"
              value={sim.locked_until ? formatTime(sim.locked_until) : '—'}
            />
            <Row label="Seed" value={String(sim.seed)} />
          </InfoCard>
        )}
      </section>

      {/* Snapshot data */}
      {c.snapshot_data && Object.keys(c.snapshot_data).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Snapshot</h2>
          <pre className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 text-xs text-zinc-300">
            {JSON.stringify(c.snapshot_data, null, 2)}
          </pre>
        </section>
      )}

      {/* Events timeline */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Events ({events.length})</h2>
        {events.length === 0 ? (
          <p className="text-sm text-zinc-500">No events yet.</p>
        ) : (
          <ol className="space-y-2">
            {events.map((ev) => (
              <li key={ev.id} className="flex gap-3">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-500">
                  {formatRelative(ev.created_at)}
                </span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
                  {ev.kind}
                </span>
                <span className="text-sm text-zinc-200">{ev.text}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-zinc-400">{title}</h3>
      <dl className="space-y-2">{children}</dl>
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
