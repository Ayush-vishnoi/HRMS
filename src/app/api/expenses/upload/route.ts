import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireEmployee, isAuthAccessError, authAccessErrorResponse } from '@/lib/auth-session';

const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp']);

export async function POST(request: Request) {
  try {
    const employee = await requireEmployee();
    const formData = await request.formData();
    const file = formData.get('receipt') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ success: false, error: 'Receipt file is required.' }, { status: 400 });
    }

    const extension = path.extname(file.name).toLowerCase().slice(1);
    if (!ALLOWED_TYPES.has(file.type) || !ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { success: false, error: 'Only PDF, JPG, PNG, and WEBP receipts are supported.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Receipt must be 10 MB or smaller.' },
        { status: 400 },
      );
    }

    const filename = `${employee.id}-${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const receiptsDirectory = path.join(process.cwd(), 'uploads', 'expenses');
    await fs.mkdir(receiptsDirectory, { recursive: true });
    await fs.writeFile(path.join(receiptsDirectory, filename), Buffer.from(await file.arrayBuffer()));

    return NextResponse.json({
      success: true,
      data: { receiptUrl: `/api/expenses/receipt/${filename}`, fileName: file.name },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error uploading expense receipt:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload receipt.' }, { status: 500 });
  }
}
