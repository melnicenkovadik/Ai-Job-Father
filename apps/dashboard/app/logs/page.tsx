import { AutoRefresh } from '@/components/auto-refresh';
import { StatusBadge } from '@/components/badge';
import { formatRelative } from '@/lib/format';
import { getLogs } from '@/lib/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const TIME_RANGES = [
  { label: '1h', ms: 3600 * 1000 },
  { label: '6h', ms: 6 * 3600 * 1000 },
  { label: '24h', ms: 24 * 3600 * 1000 },
  { label: '7d', ms: 7 * 24 * 3600 * 1000 },
];

type Props = {
  searchParams: Promise<{
    page?: string;
    level?: string;
    context?: string;
    userId?: string;
    range?: string;
  }>;
};

export default async function LogsPage({ searchParams }: Props) {
  const { page: pageStr, level, context, userId, range } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1'));
  const limit = 50;

  const since = range ? new Date(Date.now() - Number(range)).toISOString() : undefined;

  const { rows, total } = await getLogs({ page, limit, level, context, userId, since });
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <AutoRefresh intervalMs={10_000} />

      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logs</h1>
          <p className="mt-1 text-sm text-zinc-500">{total} entries · auto-refreshes every 10s</p>
        </div>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <FilterLink
          label="All levels"
          href={buildHref({ context, userId, range })}
          active={!level}
        />
        {LEVELS.map((l) => (
          <FilterLink
            key={l}
            label={l}
            href={buildHref({ level: l, context, userId, range })}
            active={level === l}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterLink label="All time" href={buildHref({ level, context, userId })} active={!range} />
        {TIME_RANGES.map(({ label, ms }) => (
          <FilterLink
            key={label}
            label={`Last ${label}`}
            href={buildHref({ level, context, userId, range: String(ms) })}
            active={range === String(ms)}
          />
        ))}
      </div>

      {userId && (
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Filtered by user: {userId}</span>
          <Link
            href={buildHref({ level, context, range })}
            className="text-zinc-500 hover:text-zinc-300"
          >
            × clear
          </Link>
        </div>
      )}

      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">Level</th>
                <th className="px-4 py-2 text-left">Context</th>
                <th className="px-4 py-2 text-left">Message</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((l) => (
                <tr
                  key={l.id}
                  className={`transition-colors hover:bg-zinc-900/60 ${
                    l.level === 'error' || l.level === 'fatal' ? 'bg-red-950/20' : ''
                  }`}
                >
                  <td className="px-4 py-2">
                    <StatusBadge status={l.level} />
                  </td>
                  <td className="max-w-[160px] truncate px-4 py-2 font-mono text-xs text-zinc-400">
                    {l.context ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-zinc-200">
                    <span className="line-clamp-2">{l.message}</span>
                    {l.error_message && <p className="text-xs text-red-400">{l.error_message}</p>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                    {l.user_id ? (
                      <Link href={`/users/${l.user_id}`} className="hover:text-zinc-300">
                        {l.user_id.slice(0, 8)}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right text-zinc-500">
                    {formatRelative(l.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          level={level}
          context={context}
          userId={userId}
          range={range}
        />
      )}
    </div>
  );
}

function buildHref(params: {
  level?: string | undefined;
  context?: string | undefined;
  userId?: string | undefined;
  range?: string | undefined;
  page?: number | undefined;
}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `/logs${qs ? `?${qs}` : ''}`;
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
  level,
  context,
  userId,
  range,
}: {
  page: number;
  totalPages: number;
  level?: string | undefined;
  context?: string | undefined;
  userId?: string | undefined;
  range?: string | undefined;
}) {
  return (
    <div className="flex items-center justify-between text-sm text-zinc-400">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={buildHref({ level, context, userId, range, page: page - 1 })}
            className="rounded border border-zinc-700 px-3 py-1 hover:border-zinc-500 hover:text-zinc-200"
          >
            ← Prev
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={buildHref({ level, context, userId, range, page: page + 1 })}
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
      No log entries match the current filters.
    </div>
  );
}
