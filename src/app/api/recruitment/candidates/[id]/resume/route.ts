import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { db } from '@/lib/db';
import { requireRecruitmentUser, canUserAccessJob } from '@/lib/recruitment/rbac-service';
import { extractResumeText } from '@/lib/recruitment/intelligence/extractor';
import { parseResumeContent } from '@/lib/recruitment/intelligence/parser';
import { calculateAndPersistMatch } from '@/lib/recruitment/intelligence/match-engine';
import { generateDuplicateKey } from '@/lib/recruitment/intelligence/duplicate-detector';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
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
      return NextResponse.json({ error: 'Unauthorized to access this candidate resume.' }, { status: 403 });
    }

    if (!candidate.resumeDocument) {
      return NextResponse.json({ error: 'No resume uploaded for this candidate.' }, { status: 404 });
    }

    const fullPath = path.join(process.cwd(), 'uploads', 'resumes', path.basename(candidate.resumeDocument.storagePath));
    try {
      const fileBuffer = await fs.readFile(fullPath);
      const mimeTypes: Record<string, string> = {
        pdf: 'application/pdf',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
      };
      const contentType = mimeTypes[candidate.resumeDocument.fileType] || 'application/octet-stream';

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${candidate.resumeDocument.fileName}"`,
        },
      });
    } catch (readErr) {
      return NextResponse.json({ error: 'Resume file could not be read from disk.' }, { status: 404 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const user = await requireRecruitmentUser();
    const { id } = await context.params;

    const candidate = await db.recruitmentCandidate.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found.' }, { status: 404 });
    }

    if (!canUserAccessJob(user, candidate.job)) {
      return NextResponse.json({ error: 'Unauthorized to manage this candidate.' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No resume file provided.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Extract text
    const extracted = await extractResumeText(file.name, buffer, candidate.id);

    // 2. Parse structured data
    let parsedData;
    let parsingStatus = 'COMPLETED';
    let parsingError: string | null = null;

    try {
      parsedData = await parseResumeContent(extracted.text, candidate.id);
    } catch (parseErr: any) {
      parsingStatus = 'FAILED';
      parsingError = parseErr.message;
    }

    // 3. Save Resume Document metadata
    const resumeDoc = await db.candidateResumeDocument.upsert({
      where: { candidateId: candidate.id },
      create: {
        candidateId: candidate.id,
        fileName: extracted.fileName,
        fileType: extracted.fileType,
        fileSize: extracted.fileSize,
        storagePath: extracted.storagePath,
        fileHash: extracted.fileHash,
        uploadedById: user.id,
        parsingStatus,
        parserVersion: 'v1.0-deterministic',
        parsingError,
        rawTextSample: extracted.text.slice(0, 500),
      },
      update: {
        fileName: extracted.fileName,
        fileType: extracted.fileType,
        fileSize: extracted.fileSize,
        storagePath: extracted.storagePath,
        fileHash: extracted.fileHash,
        uploadedById: user.id,
        uploadedAt: new Date(),
        parsingStatus,
        parserVersion: 'v1.0-deterministic',
        parsingError,
        rawTextSample: extracted.text.slice(0, 500),
      },
    });

    // 4. Update Candidate with parsed fields if parsing succeeded
    if (parsedData) {
      const dupKey = generateDuplicateKey(parsedData.email || candidate.email, parsedData.phone || candidate.phone, extracted.fileHash);

      await db.recruitmentCandidate.update({
        where: { id: candidate.id },
        data: {
          experience: parsedData.experienceDisplay || candidate.experience,
          currentRole: parsedData.currentRole || candidate.currentRole,
          location: parsedData.location || candidate.location,
          summary: parsedData.summary || candidate.summary,
          parsed_resume: parsedData as any,
          resumeUrl: `/api/recruitment/candidates/${candidate.id}/resume`,
          duplicate_key: dupKey,
          tags: Array.from(new Set([...candidate.tags, ...parsedData.topSkills.slice(0, 3)])),
        },
      });

      // 5. Calculate and persist match score against candidate's job
      const matchResult = await calculateAndPersistMatch(candidate.id, candidate.jobId);

      // 6. Audit log
      await db.auditLog.create({
        data: {
          id: `audit-res-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          action: 'RESUME_PARSED',
          module: 'Recruitment',
          employeeId: user.id,
          details: JSON.stringify({
            candidateId: candidate.id,
            candidateName: candidate.name,
            fileName: extracted.fileName,
            fileHash: extracted.fileHash,
            extractedSkillsCount: parsedData.skills.length,
            matchScore: matchResult.overallScore,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        resumeDocument: resumeDoc,
        parsedData,
        matchResult,
      });
    }

    return NextResponse.json({
      success: true,
      resumeDocument: resumeDoc,
      warning: 'Resume uploaded but automated parsing failed. Candidate details can be entered manually.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
