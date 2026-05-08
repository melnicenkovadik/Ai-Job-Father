'use client';

import { MutationCache, QueryCache, QueryClient, isServer } from '@tanstack/react-query';
import { getBrowserLogger } from './logger';

/**
 * Two cache-level error handlers funnel every failing query and mutation
 * into `app_logs` with structured context. They run *in addition to*
 * any per-call `onError` callback the feature wires up — those are still
 * useful for showing a banner / toast, while these guarantee the
 * incident is observable in the operator dashboard regardless of
 * whether the feature handler bothered to log it.
 *
 * `mutationKey` and `queryKey` make filtering trivial:
 *   `data->>queryKey` ?| array['profiles', 'campaigns']
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
    queryCache: new QueryCache({
      onError: (err, query) => {
        if (isServer) return;
        getBrowserLogger().error({
          context: 'react-query.query',
          message: err instanceof Error ? err.message : String(err),
          data: { queryKey: query.queryKey },
          error: err,
        });
      },
    }),
    mutationCache: new MutationCache({
      onError: (err, _vars, _ctx, mutation) => {
        if (isServer) return;
        getBrowserLogger().error({
          context: 'react-query.mutation',
          message: err instanceof Error ? err.message : String(err),
          data: { mutationKey: mutation.options.mutationKey ?? null },
          error: err,
        });
      },
    }),
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
