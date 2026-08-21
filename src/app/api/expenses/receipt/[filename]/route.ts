import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireEmployee, isAuthAccessError, authAccessErrorResponse } from '@/lib/auth-session';

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
    const filePath = path.join(process.cwd(), 'uploads', 'expenses', safeFilename);
    const fileBuffer = await fs.readFile(filePath);

    return new NextResponse(fileBuffer, {
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
