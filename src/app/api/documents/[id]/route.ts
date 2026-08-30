import path from 'node:path';
import { NextResponse } from 'next/server';
import { DocumentRequestStatus } from '@prisma/client';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
} from '@/lib/auth-session';
import { readDocumentBlobWithDiskFallback } from '@/lib/documents/db-storage';

const LEGACY_DISK_DOCS_DIR = path.join(process.cwd(), 'uploads', 'documents', 'employee');

/** Exit letters follow the lock → unlock → one-time download → revoke workflow. */
const EXIT_LETTER_NAMES = ['Relieving Letter', 'Experience Letter'];

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
        locked_until: true,
        downloaded_at: true,
        shared_by_hr: true,
      },
    });

    if (!document?.storage_key) {
      return NextResponse.json({ success: false, error: 'Document file not found.' }, { status: 404 });
    }
    const isAdmin = employee.userRole === 'admin';
    if (!isAdmin && employee.id !== document.employeeId) {
      return NextResponse.json({ success: false, error: 'You do not have access to this document.' }, { status: 403 });
    }

    // Share gating: employees can only download documents HR has shared with
    // them (verified, generated, or explicitly sent). Admins are exempt.
    if (!isAdmin && !document.shared_by_hr) {
      return NextResponse.json(
        { success: false, error: 'This document is not yet shared by HR. It will be available for download once HR sends it to you.' },
        { status: 403 },
      );
    }

    const isExitLetter = EXIT_LETTER_NAMES.includes(document.name);

    if (!isAdmin && isExitLetter) {
      // Lock enforcement: exit letters stay locked until the notice period
      // (relieving date) ends, then unlock automatically on that day.
      if (document.locked_until && document.locked_until.getTime() > Date.now()) {
        return NextResponse.json(
          {
            success: false,
            error: `This letter is locked until your notice period ends (${document.locked_until.toISOString().slice(0, 10)}). It will unlock automatically on that day.`,
          },
          { status: 403 },
        );
      }

      // One-time download: an already-downloaded letter cannot be fetched again.
      if (document.downloaded_at) {
        return NextResponse.json(
          { success: false, error: 'This letter has already been downloaded. Download is allowed only once.' },
          { status: 403 },
        );
      }
    }

    const safeKey = path.basename(document.storage_key);
    // Bytes live in PostgreSQL (document_blobs); legacy rows fall back to disk.
    const fileBuffer = await readDocumentBlobWithDiskFallback(safeKey, LEGACY_DISK_DOCS_DIR);
    if (!fileBuffer) {
      return NextResponse.json({ success: false, error: 'Document file not found.' }, { status: 404 });
    }
    const fileName = document.name.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!isAdmin && isExitLetter) {
      // Atomically claim the one-time download (guards against parallel requests).
      const claimed = await db.employeeDocument.updateMany({
        where: { id: document.id, downloaded_at: null },
        data: { downloaded_at: new Date() },
      });
      if (claimed.count === 0) {
        return NextResponse.json(
          { success: false, error: 'This letter has already been downloaded. Download is allowed only once.' },
          { status: 403 },
        );
      }

      // Full access revocation: once every exit letter of this employee has
      // been downloaded, deactivate the account and kill all sessions.
      const pendingLetters = await db.employeeDocument.count({
        where: {
          employeeId: document.employeeId,
          name: { in: EXIT_LETTER_NAMES },
          storage_key: { not: null },
          downloaded_at: null,
        },
      });

      if (pendingLetters === 0) {
        await db.$transaction(async (tx) => {
          await tx.employee.update({
            where: { id: document.employeeId },
            data: { status: 'Offboarded' },
          });
          await tx.authSession.deleteMany({
            where: { employeeId: document.employeeId },
          });
          await tx.auditLog.create({
            data: {
              id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              action: 'UPDATE',
              module: 'Exit',
              employeeId: document.employeeId,
              details: JSON.stringify({
                action: 'Access Revoked After Letter Download',
                lastDownloadedDocumentId: document.id,
                reason: 'All exit letters downloaded',
              }),
            },
          });
        });
      }
    }

    // Non-blocking: when the employee downloads a file attached to a document
    // request, mark that request Downloaded for HR visibility. This never
    // blocks re-downloading, admins previewing files don't count, and any
    // failure here must not fail the download itself.
    if (!isAdmin) {
      try {
        const attachment = await db.documentRequestAttachment.findFirst({
          where: { documentId: document.id },
          select: { requestId: true },
        });
        if (attachment) {
          await db.documentRequest.updateMany({
            where: {
              id: attachment.requestId,
              employeeId: employee.id,
              status: DocumentRequestStatus.Sent,
            },
            data: { status: DocumentRequestStatus.Downloaded, downloadedAt: new Date() },
          });
        }
      } catch (markError) {
        console.error('Failed to mark document request as downloaded:', markError);
      }
    }

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
