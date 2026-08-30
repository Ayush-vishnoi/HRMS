import { NextResponse } from 'next/server';
import path from 'path';
import { db } from '@/lib/db';
import { readDocumentBlobWithDiskFallback } from '@/lib/documents/db-storage';
import { requireRecruitmentUser, canUserAccessJob } from '@/lib/recruitment/rbac-service';
import { extractResumeText } from '@/lib/recruitment/intelligence/extractor';
import { parseResumeContent } from '@/lib/recruitment/intelligence/parser';
import { calculateAndPersistMatch } from '@/lib/recruitment/intelligence/match-engine';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await context.params;

    const candidate = await db.recruitmentCandidate.findUnique({
      where: { id },
      include: { job: true, resumeDocument: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    if (!canUserAccessJob(user, candidate.job)) {
      return NextResponse.json({ error: 'Unauthorized to manage this candidate.' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    // If manual overrides are provided:
    if (body.manualOverrides) {
      const existingParsed: any = candidate.parsed_resume || {};
      const updatedParsed = {
        ...existingParsed,
        ...body.manualOverrides,
        provenance: {
          ...(existingParsed.provenance || {}),
          ...Object.keys(body.manualOverrides).reduce((acc: any, k) => {
            acc[k] = 'MANUAL';
            return acc;
          }, {}),
        },
        verifiedBy: user.id,
        verifiedAt: new Date().toISOString(),
      };

      await db.recruitmentCandidate.update({
        where: { id },
        data: {
          experience: body.manualOverrides.experienceDisplay || body.manualOverrides.experience || candidate.experience,
          currentRole: body.manualOverrides.currentRole || candidate.currentRole,
          location: body.manualOverrides.location || candidate.location,
          summary: body.manualOverrides.summary || candidate.summary,
          parsed_resume: updatedParsed,
        },
      });

      const match = await calculateAndPersistMatch(candidate.id, candidate.jobId);

      await db.auditLog.create({
        data: {
          id: `audit-man-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'CANDIDATE_PROFILE_UPDATED_FROM_PARSE',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            candidateId: candidate.id,
            manualFields: Object.keys(body.manualOverrides),
          }),
        },
      });

      return NextResponse.json({ success: true, parsedData: updatedParsed, match });
    }

    // Otherwise, perform full re-parsing from stored document
    if (!candidate.resumeDocument) {
      return NextResponse.json({ error: 'No uploaded resume document exists for this candidate to re-parse.' }, { status: 400 });
    }

    // Bytes live in PostgreSQL (document_blobs); legacy resumes fall back to disk.
    const buffer = await readDocumentBlobWithDiskFallback(
      path.basename(candidate.resumeDocument.storagePath),
      path.join(process.cwd(), 'uploads', 'resumes'),
    );
    if (!buffer) {
      return NextResponse.json({ error: 'Stored resume file could not be found.' }, { status: 404 });
    }
    const extracted = await extractResumeText(candidate.resumeDocument.fileName, buffer, candidate.id);
    const parsedData = await parseResumeContent(extracted.text, candidate.id);

    await db.recruitmentCandidate.update({
      where: { id },
      data: {
        experience: parsedData.experienceDisplay || candidate.experience,
        currentRole: parsedData.currentRole || candidate.currentRole,
        location: parsedData.location || candidate.location,
        summary: parsedData.summary || candidate.summary,
        parsed_resume: parsedData as any,
      },
    });

    const match = await calculateAndPersistMatch(candidate.id, candidate.jobId);

    await db.auditLog.create({
      data: {
        id: `audit-reparse-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        action: 'RESUME_PARSED',
        module: 'Recruitment',
        employeeId: user.id,
        details: JSON.stringify({
          candidateId: candidate.id,
          reparsed: true,
          matchScore: match.overallScore,
        }),
      },
    });

    return NextResponse.json({ success: true, parsedData, match });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
