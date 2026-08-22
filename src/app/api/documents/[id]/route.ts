import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';

const SECURE_DOCS_DIR = path.join(process.cwd(), 'uploads', 'documents', 'employee');

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> },
) {
  try {
    const employee = await requireEmployee();
    const { id } = await props.params;
    const document = await db.employeeDocument.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        name: true,
        mime_type: true,
        storage_key: true,
      },
    });

    if (!document?.storage_key) {
      return NextResponse.json({ success: false, error: 'Document file not found.' }, { status: 404 });
    }
    if (employee.userRole !== 'admin' && employee.id !== document.employeeId) {
      return NextResponse.json({ success: false, error: 'You do not have access to this document.' }, { status: 403 });
    }

    const safeKey = path.basename(document.storage_key);
    const fileBuffer = await readFile(path.join(SECURE_DOCS_DIR, safeKey));
    const fileName = document.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new Response(fileBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': document.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(fileBuffer.length),
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error downloading employee document:', error);
    return NextResponse.json({ success: false, error: 'Failed to download document.' }, { status: 404 });
  }
}
