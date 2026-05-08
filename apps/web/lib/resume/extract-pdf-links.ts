import 'server-only';
import { extractLinks } from 'unpdf';

/**
 * Pull every PDF `Link` annotation URL out of `bytes`. Best-effort:
 * a failure here just degrades to "no link fallback" and the caller
 * proceeds without enrichment. Lives at the web-layer boundary so
 * both heuristic and AI parser routes can share one implementation.
 */
export async function extractPdfLinks(bytes: Uint8Array): Promise<string[]> {
  try {
    // unpdf transfers the buffer to a worker. If extractText already
    // ran on the same view, the buffer is detached — copy it before
    // handing off so unpdf doesn't try to read freed memory.
    const safe = new Uint8Array(bytes);
    const result = await extractLinks(safe);
    const raw = (result as { links?: unknown }).links ?? (result as unknown);
    if (!Array.isArray(raw)) return [];
    return raw.filter((u): u is string => typeof u === 'string' && u.length > 0);
  } catch (err) {
    if (typeof console !== 'undefined') {
      console.warn('[extractPdfLinks] failed:', err);
    }
    return [];
  }
}
