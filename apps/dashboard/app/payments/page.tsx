import { StatusBadge } from '@/components/badge';
import { formatRelative, truncateId } from '@/lib/format';
import { getPaymentsList } from '@/lib/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const PROVIDERS = ['stars', 'ton'];
const STATUSES = ['pending', 'succeeded', 'failed', 'refunded'];

type Props = { searchParams: Promise<{ page?: string; provider?: string; status?: string }> };

export default async function PaymentsPage({ searchParams }: Props) {
  const { page: pageStr, provider, status } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1'));
  const limit = 20;

  const { rows, total } = await getPaymentsList({ page, limit, provider, status });
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="mt-1 text-sm text-zinc-500">{total} total</p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterLink
          label="All providers"
          href={`/payments${status ? `?status=${status}` : ''}`}
          active={!provider}
        />
        {PROVIDERS.map((p) => (
          <FilterLink
            key={p}
            label={p}
            href={`/payments?provider=${p}${status ? `&status=${status}` : ''}`}
            active={provider === p}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterLink
          label="All statuses"
          href={`/payments${provider ? `?provider=${provider}` : ''}`}
          active={!status}
        />
        {STATUSES.map((s) => (
          <FilterLink
            key={s}
            label={s}
            href={`/payments?status=${s}${provider ? `&provider=${provider}` : ''}`}
            active={status === s}
          />
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">Provider</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-right">Currency</th>
                <th className="px-4 py-2 text-right">User</th>
                <th className="px-4 py-2 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-zinc-900/60">
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">
                    <Link href={`/payments/${p.id}`} className="hover:text-amber-400">
                      {truncateId(p.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-zinc-200">{p.provider}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-300">
                    {String(p.amount_provider)}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-400">{p.currency}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs text-zinc-500">
                    <Link href={`/users/${p.user_id}`} className="hover:text-zinc-300">
                      {truncateId(p.user_id)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-500">
                    {formatRelative(p.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} provider={provider} status={status} />
      )}
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded border px-2.5 py-1 text-xs transition-colors ${
        active
          ? 'border-zinc-500 bg-zinc-700 text-zinc-100'
          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
      }`}
    >
      {label}
    </Link>
  );
}

function Pagination({
  page,
  totalPages,
  provider,
  status,
}: {
  page: number;
  totalPages: number;
  provider?: string | undefined;
  status?: string | undefined;
}) {
  const qs = [provider && `provider=${provider}`, status && `status=${status}`]
    .filter(Boolean)
    .join('&');
  const base = `/payments?${qs}${qs ? '&' : ''}`;

  return (
    <div className="flex items-center justify-between text-sm text-zinc-400">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={`${base}page=${page - 1}`}
            className="rounded border border-zinc-700 px-3 py-1 hover:border-zinc-500 hover:text-zinc-200"
          >
            ← Prev
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={`${base}page=${page + 1}`}
            className="rounded border border-zinc-700 px-3 py-1 hover:border-zinc-500 hover:text-zinc-200"
          >
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

function Empty() {
  return (
    <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
      No payments match the current filters.
    </div>
  );
}
