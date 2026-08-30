/**
 * PostgreSQL-backed binary document storage (document_blobs table, BYTEA).
 *
 * Replaces the previous local-disk `uploads/` storage so files:
 *   - live with the rest of the data (survive redeploys / container restarts),
 *   - stay private behind authenticated API routes (never in `public/`),
 *   - are backed up with the database itself.
 *
 * `storage_provider` values in employee_documents:
 *   - 'db'        → bytes are in document_blobs (current)
 *   - 'local-private' → legacy rows whose bytes are still on disk (backfilled)
 */
import { db } from '@/lib/db';

export type BlobCategory = 'employee' | 'offers' | 'resumes' | 'expenses';

/** Persist a file's bytes under a storage key. Upsert keeps re-saves idempotent. */
export async function saveDocumentBlob(params: {
  key: string;
  category: BlobCategory;
  data: Buffer;
  mimeType?: string | null;
}): Promise<void> {
  const key = sanitizeKey(params.key);
  await db.documentBlob.upsert({
    where: { id: key },
    create: {
      id: key,
      category: params.category,
      data: params.data,
      mime_type: params.mimeType ?? null,
      size_bytes: params.data.length,
    },
    update: {
      category: params.category,
      data: params.data,
      mime_type: params.mimeType ?? null,
      size_bytes: params.data.length,
    },
  });
}

/** Read a stored file's bytes. Returns null when the key has no blob. */
export async function readDocumentBlob(key: string): Promise<Buffer | null> {
  const blob = await db.documentBlob.findUnique({
    where: { id: sanitizeKey(key) },
    select: { data: true },
  });
  return blob ? Buffer.from(blob.data) : null;
}

/** Read a stored blob, falling back to the legacy on-disk copy if present. */
export async function readDocumentBlobWithDiskFallback(
  key: string,
  diskPath: string,
): Promise<Buffer | null> {
  const fromDb = await readDocumentBlob(key);
  if (fromDb) return fromDb;
  try {
    const { readFile } = await import('node:fs/promises');
    const path = await import('node:path');
    return await readFile(path.join(diskPath, sanitizeKey(key)));
  } catch {
    return null;
  }
}

/** Strip any path components — keys are flat filenames, which also guards
 *  against path traversal when a key is used to build a disk path. */
export function sanitizeKey(key: string): string {
  return key.split('/').pop()!.split('\\').pop()!.replace(/\0/g, '');
}
