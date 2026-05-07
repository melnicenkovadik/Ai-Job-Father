import 'server-only';
import { getServerLogger } from '@/lib/logger/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Upload a resume PDF to the per-user folder in the `resumes` Storage bucket.
 *
 * Path convention (per migration `20260419000200_resumes_bucket.sql`):
 *   `resumes/{userId}/{timestamp}-{hash8}.pdf`
 *
 * Service role bypasses the per-user RLS policy. The route handler is
 * responsible for confirming the calling user owns the upload before
 * invoking this helper.
 *
 * Best-effort: failures don't throw — they log a warning and return the
 * computed hash so callers can still record provenance. The CV text is
 * already parsed at this point; losing storage doesn't lose the user's
 * extracted data.
 */
export interface UploadResumeResult {
  readonly storagePath: string;
  readonly hash: string;
  readonly sizeBytes: number;
  readonly uploaded: boolean;
}

const BUCKET = 'resumes';
const DEDUP_WINDOW_MS = 60_000;

export async function uploadResume(
  userId: string,
  filename: string,
  bytes: Uint8Array,
): Promise<UploadResumeResult> {
  const log = getServerLogger();
  const hash = await sha256Hex(bytes);
  const sizeBytes = bytes.byteLength;
  const supabase = createServiceRoleClient();

  // Dedup: scan recent uploads for the same hash (last 60s) and reuse the
  // existing path. Two clicks on "Upload" with the same PDF shouldn't
  // create two storage objects.
  try {
    const { data: existing } = await supabase.storage.from(BUCKET).list(userId, {
      limit: 50,
      sortBy: { column: 'created_at', order: 'desc' },
    });
    const recent = (existing ?? []).find((o) => {
      if (!o.name.includes(`-${hash.slice(0, 8)}.pdf`)) return false;
      const createdAt = o.created_at ? new Date(o.created_at).getTime() : 0;
      return Date.now() - createdAt < DEDUP_WINDOW_MS;
    });
    if (recent) {
      const storagePath = `${userId}/${recent.name}`;
      log.info({
        context: 'lib/resume-storage.upload',
        message: 'dedup hit, reusing existing object',
        data: { userId, storagePath, hash },
      });
      return { storagePath, hash, sizeBytes, uploaded: false };
    }
  } catch (err) {
    // Non-fatal — proceed to upload.
    log.warn({ context: 'lib/resume-storage.upload.dedup', error: err });
  }

  const objectName = `${Date.now()}-${hash.slice(0, 8)}.pdf`;
  const storagePath = `${userId}/${objectName}`;

  try {
    // Buffer is required by @supabase/supabase-js; Uint8Array works on Node 20+.
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: 'application/pdf',
      cacheControl: '31536000',
      upsert: false,
    });
    if (error) {
      log.warn({
        context: 'lib/resume-storage.upload',
        message: 'storage upload failed',
        data: { userId, storagePath, filename },
        error,
      });
      return { storagePath, hash, sizeBytes, uploaded: false };
    }
    log.info({
      context: 'lib/resume-storage.upload',
      message: 'uploaded',
      data: { userId, storagePath, sizeBytes, hash },
    });
    return { storagePath, hash, sizeBytes, uploaded: true };
  } catch (err) {
    log.warn({
      context: 'lib/resume-storage.upload',
      message: 'storage upload threw',
      data: { userId, storagePath, filename },
      error: err,
    });
    return { storagePath, hash, sizeBytes, uploaded: false };
  }
}

/**
 * Download a previously uploaded resume by storage path. Returns the raw
 * PDF bytes for AI re-parse.
 */
export async function downloadResume(storagePath: string): Promise<Uint8Array | null> {
  const log = getServerLogger();
  const supabase = createServiceRoleClient();
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
    if (error || !data) {
      log.warn({
        context: 'lib/resume-storage.download',
        message: 'download failed',
        data: { storagePath },
        error,
      });
      return null;
    }
    const buf = await data.arrayBuffer();
    return new Uint8Array(buf);
  } catch (err) {
    log.warn({
      context: 'lib/resume-storage.download',
      message: 'download threw',
      data: { storagePath },
      error: err,
    });
    return null;
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  // Copy into a plain ArrayBuffer — `crypto.subtle.digest` rejects the
  // `ArrayBufferLike` union (covers SharedArrayBuffer) under TS strict.
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);
  const digest = await crypto.subtle.digest('SHA-256', ab);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
