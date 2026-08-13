import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DocumentRequestStatus, DocumentStatus } from '@prisma/client';

const mapDocStatusToPrisma = (status?: string): DocumentStatus => {
  if (!status) return DocumentStatus.UnderReview;
  const s = status.toLowerCase().replace(/[^a-z]/g, '');
  if (s === 'verified') return DocumentStatus.Verified;
  if (s.includes('action')) return DocumentStatus.ActionRequired;
  return DocumentStatus.UnderReview;
};

const mapPrismaDocStatusToDisplay = (status: DocumentStatus): string => {
  switch (status) {
    case DocumentStatus.Verified: return 'Verified';
    case DocumentStatus.ActionRequired: return 'Action Required';
    case DocumentStatus.UnderReview:
    default:
      return 'Under Review';
  }
};

const mapReqStatusToPrisma = (status?: string): DocumentRequestStatus => {
  if (!status) return DocumentRequestStatus.Pending;
  const s = status.toLowerCase().replace(/[^a-z]/g, '');
  if (s === 'completed') return DocumentRequestStatus.Completed;
  if (s.includes('review')) return DocumentRequestStatus.InReview;
  return DocumentRequestStatus.Pending;
};

const mapPrismaReqStatusToDisplay = (status: DocumentRequestStatus): string => {
  switch (status) {
    case DocumentRequestStatus.Completed: return 'Completed';
    case DocumentRequestStatus.InReview: return 'In Review';
    case DocumentRequestStatus.Pending:
    default:
      return 'Pending';
  }
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const role = searchParams.get('role') || 'employee';

    const whereClause = (role === 'admin' && !searchParams.has('employeeId'))
      ? undefined
      : (employeeId ? { employeeId } : undefined);

    const [documents, requests] = await Promise.all([
      db.employeeDocument.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: true },
          },
        },
      }),
      db.documentRequest.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: true },
          },
        },
      }),
    ]);

    const formattedDocs = documents.map((doc) => ({
      id: doc.id,
      employeeId: doc.employeeId,
      employeeName: doc.employee.name,
      name: doc.name,
      type: doc.type,
      uploadedOn: doc.uploadedOn,
      size: doc.size,
      status: mapPrismaDocStatusToDisplay(doc.status),
      note: doc.note || '',
    }));

    const formattedReqs = requests.map((req) => ({
      id: req.id,
      employeeId: req.employeeId,
      requestedBy: req.employee.name,
      documentType: req.documentType,
      reason: req.reason,
      requestedOn: req.requestedOn,
      status: mapPrismaReqStatusToDisplay(req.status),
    }));

    return NextResponse.json({
      success: true,
      data: {
        documents: formattedDocs,
        requests: formattedReqs,
      },
    });
  } catch (error) {
    console.error('Error fetching documents data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action || 'upload';

    if (action === 'upload') {
      const count = await db.employeeDocument.count();
      const id = `DOC-${204 + count + 1}`;

      const newDoc = await db.employeeDocument.create({
        data: {
          id,
          employeeId: body.employeeId || 'EMP-001',
          name: body.name,
          type: body.type || 'Identity Proof',
          size: body.size || '1.0 MB',
          status: mapDocStatusToPrisma(body.status),
          note: body.note || 'Uploaded by employee and queued for HR verification.',
          uploadedOn: body.uploadedOn || new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
        },
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: true },
          },
        },
      });

      const formatted = {
        id: newDoc.id,
        employeeId: newDoc.employeeId,
        employeeName: newDoc.employee.name,
        name: newDoc.name,
        type: newDoc.type,
        uploadedOn: newDoc.uploadedOn,
        size: newDoc.size,
        status: mapPrismaDocStatusToDisplay(newDoc.status),
        note: newDoc.note || '',
      };

      return NextResponse.json({ success: true, data: formatted, type: 'document' });
    }

    if (action === 'request') {
      const count = await db.documentRequest.count();
      const id = `REQ-${87 + count + 1}`;

      const newReq = await db.documentRequest.create({
        data: {
          id,
          employeeId: body.employeeId || 'EMP-001',
          documentType: body.documentType,
          reason: body.reason,
          status: mapReqStatusToPrisma(body.status),
          requestedOn: body.requestedOn || new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()),
        },
        include: {
          employee: {
            select: { id: true, name: true, employeeCode: true, department: true },
          },
        },
      });

      const formatted = {
        id: newReq.id,
        employeeId: newReq.employeeId,
        requestedBy: newReq.employee.name,
        documentType: newReq.documentType,
        reason: newReq.reason,
        requestedOn: newReq.requestedOn,
        status: mapPrismaReqStatusToDisplay(newReq.status),
      };

      return NextResponse.json({ success: true, data: formatted, type: 'request' });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error creating document/request:', error);
    return NextResponse.json({ success: false, error: 'Failed to process document action' }, { status: 500 });
  }
}
