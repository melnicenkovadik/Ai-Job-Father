const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  paid: 'bg-blue-950 text-blue-300 border-blue-900',
  searching: 'bg-amber-950 text-amber-300 border-amber-900',
  applying: 'bg-purple-950 text-purple-300 border-purple-900',
  completed: 'bg-green-950 text-green-300 border-green-900',
  cancelled: 'bg-red-950 text-red-300 border-red-900',
  failed: 'bg-red-950 text-red-300 border-red-900',
  pending: 'bg-amber-950 text-amber-300 border-amber-900',
  succeeded: 'bg-green-950 text-green-300 border-green-900',
  refunded: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  error: 'bg-red-950 text-red-300 border-red-900',
  warn: 'bg-amber-950 text-amber-300 border-amber-900',
  info: 'bg-blue-950 text-blue-300 border-blue-900',
  debug: 'bg-zinc-800 text-zinc-400 border-zinc-700',
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? STATUS_COLORS.draft;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {status}
    </span>
  );
}
