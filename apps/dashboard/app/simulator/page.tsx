import { StatusBadge } from '@/components/badge';
import { formatRelative } from '@/lib/format';
import { getSimulatorCampaigns } from '@/lib/queries';
import Link from 'next/link';
import { SimulatorRowActions } from './simulator-row';

export const dynamic = 'force-dynamic';

export default async function SimulatorPage() {
  const campaigns = await getSimulatorCampaigns();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Simulator</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {campaigns.length} active campaigns · force-tick clears{' '}
          <code className="font-mono">locked_until</code> so the next Mini App request fires
          immediately
        </p>
      </header>

      {campaigns.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
          No active campaigns (paid / searching / applying).
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">Campaign</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Progress</th>
                <th className="px-4 py-2 text-right">Ticks rem.</th>
                <th className="px-4 py-2 text-right">Locked until</th>
                <th className="px-4 py-2 text-right">Last tick</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {campaigns.map((c) => {
                const sim = c.simulatorState;
                const isLocked = sim?.locked_until && new Date(sim.locked_until) > new Date();

                return (
                  <tr key={c.id} className="transition-colors hover:bg-zinc-900/60">
                    <td className="px-4 py-3">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="text-zinc-100 hover:text-amber-400"
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {c.progress_found}/{c.quota}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-300">
                      {sim ? String(sim.ticks_remaining) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-400">
                      {sim?.locked_until ? (
                        <span className={isLocked ? 'text-red-400' : 'text-zinc-500'}>
                          {formatRelative(sim.locked_until)}
                        </span>
                      ) : (
                        <span className="text-green-400">free</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-zinc-500">
                      {c.last_ticked_at ? formatRelative(c.last_ticked_at) : '—'}
                    </td>
                    <SimulatorRowActions campaignId={c.id} hasSimulator={sim !== null} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
