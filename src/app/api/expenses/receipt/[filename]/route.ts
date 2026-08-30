import { NextResponse } from 'next/server';
import path from 'path';
import { requireEmployee, isAuthAccessError, authAccessErrorResponse } from '@/lib/auth-session';
import { readDocumentBlobWithDiskFallback } from '@/lib/documents/db-storage';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

interface RouteContext {
  params: Promise<{ filename: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    await requireEmployee();
    const { filename } = await context.params;
    const safeFilename = path.basename(filename);
    const extension = path.extname(safeFilename).toLowerCase().slice(1);
    // Bytes live in PostgreSQL (document_blobs); legacy receipts fall back to disk.
    const fileBuffer = await readDocumentBlobWithDiskFallback(safeFilename, path.join(process.cwd(), 'uploads', 'expenses'));
    if (!fileBuffer) {
      return NextResponse.json({ success: false, error: 'Receipt could not be found.' }, { status: 404 });
    }

    return new NextResponse(fileBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${safeFilename}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    return NextResponse.json({ success: false, error: 'Receipt could not be found.' }, { status: 404 });
  }
}
