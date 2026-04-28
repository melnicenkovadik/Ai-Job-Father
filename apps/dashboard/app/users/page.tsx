import { formatRelative, truncateId } from '@/lib/format';
import { getUsersList } from '@/lib/queries';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ page?: string }> };

export default async function UsersPage({ searchParams }: Props) {
  const { page: pageStr } = await searchParams;
  const page = Math.max(1, Number(pageStr ?? '1'));
  const limit = 20;

  const { rows, total } = await getUsersList(page, limit);
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="mt-1 text-sm text-zinc-500">{total} total</p>
      </header>

      {rows.length === 0 ? (
        <Empty />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">ID</th>
                <th className="px-4 py-2 text-left">User</th>
                <th className="px-4 py-2 text-left">Locale</th>
                <th className="px-4 py-2 text-right">Campaigns</th>
                <th className="px-4 py-2 text-right">Payments</th>
                <th className="px-4 py-2 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {rows.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-zinc-900/60">
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                    <Link href={`/users/${u.id}`} className="hover:text-zinc-300">
                      {truncateId(u.id)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/users/${u.id}`} className="text-zinc-100 hover:text-amber-400">
                      {u.first_name ?? '—'} {u.last_name ?? ''}
                    </Link>
                    {u.username && (
                      <span className="ml-2 text-xs text-zinc-500">@{u.username}</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-400">{u.locale ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-300">
                    {u.campaign_count}
                  </td>
                  <td className="px-4 py-2 text-right font-mono text-zinc-300">
                    {u.payment_count}
                  </td>
                  <td className="px-4 py-2 text-right text-zinc-500">
                    {formatRelative(u.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} />}
    </div>
  );
}

function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  return (
    <div className="flex items-center justify-between text-sm text-zinc-400">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={`/users?page=${page - 1}`}
            className="rounded border border-zinc-700 px-3 py-1 hover:border-zinc-500 hover:text-zinc-200"
          >
            ← Prev
          </Link>
        )}
        {page < totalPages && (
          <Link
            href={`/users?page=${page + 1}`}
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
      No users yet.
    </div>
  );
}
