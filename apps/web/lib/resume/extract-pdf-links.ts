import 'server-only';
import { extractLinks } from 'unpdf';

/**
 * Pull every PDF `Link` annotation URL out of `bytes`. Best-effort:
 * a failure here just degrades to "no link fallback" and the caller
 * proceeds without enrichment.
 *
 * The buffer is cloned defensively because earlier callers may have
 * passed bytes through `unpdf.extractText`, which transfers the
 * underlying ArrayBuffer to a worker and detaches the view we get
 * here. A `new Uint8Array(detachedView)` would copy zero bytes and
 * `extractLinks` would silently return [] — which is exactly the
 * "no URLs in production" symptom we hit on the first deploy.
 */
export async function extractPdfLinks(bytes: Uint8Array): Promise<string[]> {
  // Lazy logger import — this module is consumed by routes whose
  // tests boot with no env vars; eager import would crash the env
  // validator. Lazy keeps the module tree-shakable for the heuristic
  // unit test which only hits the core parser.
  const { getServerLogger } = await import('@/lib/logger/server');
  const log = getServerLogger();
  try {
    const safe = bytes.slice(0); // Uint8Array#slice always copies
    const result = await extractLinks(safe);
    const raw = (result as { links?: unknown }).links ?? (result as unknown);
    if (!Array.isArray(raw)) {
      log.warn({
        context: 'lib/resume.extract-pdf-links',
        message: 'unpdf returned non-array',
        data: { typeOfResult: typeof result },
      });
      return [];
    }
    const urls = raw.filter((u): u is string => typeof u === 'string' && u.length > 0);
    log.info({
      context: 'lib/resume.extract-pdf-links',
      message: 'links extracted',
      data: { count: urls.length },
    });
    return urls;
  } catch (err) {
    log.warn({
      context: 'lib/resume.extract-pdf-links',
      message: 'extractLinks failed; continuing without URL fallback',
      error: err,
    });
    return [];
  }
}
