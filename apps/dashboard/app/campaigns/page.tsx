import { StatusBadge } from '@/components/badge';
import { formatRelative, truncateId } from '@/lib/format';
import { getCampaignsList } from '@/lib/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const STATUSES = ['draft', 'paid', 'searching', 'applying', 'completed', 'cancelled', 'failed'];
const CATEGORIES = [
  'tech',
  'design',
  'marketing',
  'sales',
  'product',
  'finance',
  'hr',
  'support',
  'content',
  'ops',
  'data',
  'web3',
];

type Props = { searchParams: Promise<{ page?: string; status?: string; category?: string }> };

export default async function CampaignsPage({ searchParams }: Props) {
  const { page: pageStr, status, category } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1'));
  const limit = 20;

  const { rows, total } = await getCampaignsList({ page, limit, status, category });
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="mt-1 text-sm text-zinc-500">{total} total</p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterLink label="All statuses" href="/campaigns" active={!status} />
        {STATUSES.map((s) => (
          <FilterLink
            key={s}
            label={s}
            href={`/campaigns?status=${s}${category ? `&category=${category}` : ''}`}
            active={status === s}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterLink
          label="All categories"
          href={`/campaigns${status ? `?status=${status}` : ''}`}
          active={!category}
        />
        {CATEGORIES.map((c) => (
          <FilterLink
            key={c}
            label={c}
            href={`/campaigns?category=${c}${status ? `&status=${status}` : ''}`}
            active={category === c}
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
                <th className="px-4 py-2 text-left">Title</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Category</th>
                <th className="px-4 py-2 text-right">Quota</th>
                <th className="px-4 py-2 text-right">Found/Applied</th>
                <th className="px-4 py-2 text-right">Price (¢)</th>
                <th className="px-4 py-2 text-right">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-zinc-900/60">
                  <td className="px-4 py-2">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="text-zinc-100 hover:text-amber-400"
                    >
                      {c.title}
                    </Link>
                    <span className="ml-2 font-mono text-xs text-zinc-600">{truncateId(c.id)}</span>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="px-4 py-2 text-zinc-400">{c.category}</td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-300">{c.quota}</td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-300">
                    {c.progress_found}/{c.progress_applied}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-300">
                    {c.price_amount_cents}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-500">
                    {formatRelative(c.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} status={status} category={category} />
      )}
    </div>
  );
}

function FilterLink({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
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
  status,
  category,
}: {
  page: number;
  totalPages: number;
  status?: string | undefined;
  category?: string | undefined;
}) {
  const qs = [status && `status=${status}`, category && `category=${category}`]
    .filter(Boolean)
    .join('&');
  const base = `/campaigns?${qs}${qs ? '&' : ''}`;

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
      No campaigns match the current filters.
    </div>
  );
}
