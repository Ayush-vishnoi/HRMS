import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
  requireEmployee,
  requireEmployeeAccess,
} from '@/lib/auth-session';

const DEFAULT_COMPETENCIES = [
  {
    name: 'Technical Expertise & Craft',
    description: 'Demonstrates deep domain knowledge, quality execution, and adherence to technical standards.',
    scale: {
      1: 'Novice: Requires constant guidance on core tasks',
      2: 'Developing: Handles routine tasks with supervision',
      3: 'Proficient: Independently delivers complex technical deliverables',
      4: 'Advanced: Sets technical standards and mentors team members',
      5: 'Expert: Industry-recognized technical authority and system architect',
    },
  },
  {
    name: 'Problem Solving & Critical Thinking',
    description: 'Analyzes ambiguous challenges, identifies root causes, and implements robust solutions.',
    scale: {
      1: 'Struggles to diagnose issues without step-by-step instructions',
      2: 'Solves known problems using standard procedures',
      3: 'Effectively deconstructs complex problems and evaluates trade-offs',
      4: 'Proactively identifies systemic bottlenecks and crafts preventive solutions',
      5: 'Solves unprecedented organizational challenges with innovative methodologies',
    },
  },
  {
    name: 'Communication & Stakeholder Management',
    description: 'Articulates ideas clearly, listens actively, and aligns diverse stakeholders.',
    scale: {
      1: 'Communication is unclear or causes misunderstandings',
      2: 'Communicates adequately within immediate team',
      3: 'Clear, concise, and structured written and verbal communication',
      4: 'Tailors communication seamlessly across executive and technical audiences',
      5: 'Inspires organization-wide alignment and excels in high-stakes negotiations',
    },
  },
  {
    name: 'Collaboration & Teamwork',
    description: 'Fosters an inclusive, supportive environment and collaborates across functional silos.',
    scale: {
      1: 'Works in isolation and resists collaborative efforts',
      2: 'Participates in team activities when requested',
      3: 'Active, reliable contributor who unblocks teammates',
      4: 'Builds cross-functional bridges and elevates collective team morale',
      5: 'Champions organizational culture of mutual trust and seamless cross-org collaboration',
    },
  },
  {
    name: 'Leadership & Mentorship',
    description: 'Guides others, develops emerging talent, and drives team outcomes.',
    scale: {
      1: 'Does not support or guide colleagues',
      2: 'Provides ad-hoc assistance to peers',
      3: 'Proactively mentors junior team members and models best practices',
      4: 'Empowers high-performing teams, coaches future leaders, and drives initiatives',
      5: 'Visionary leader who attracts, retains, and grows exceptional industry talent',
    },
  },
  {
    name: 'Ownership & Accountability',
    description: 'Takes end-to-end responsibility for results, overcomes roadblocks, and delivers on commitments.',
    scale: {
      1: 'Deflects responsibility and misses deadlines frequently',
      2: 'Takes responsibility only for assigned tasks',
      3: 'Takes full ownership of outcomes and reliably delivers on commitments',
      4: 'Anticipates risks, unblocks team obstacles, and ensures flawless delivery',
      5: 'Exemplifies extreme ownership across company-wide strategic bets',
    },
  },
  {
    name: 'Customer Focus & Value Delivery',
    description: 'Understands customer/user needs and delivers high-impact, user-centric value.',
    scale: {
      1: 'Lacks awareness of end-user impact and business requirements',
      2: 'Follows specifications without considering user experience',
      3: 'Consistently prioritizes user experience and business value',
      4: 'Deeply understands customer pain points and drives product excellence',
      5: 'Transforms customer insights into long-term strategic advantage',
    },
  },
  {
    name: 'Innovation & Continuous Improvement',
    description: 'Challenges the status quo, introduces optimizations, and champions continuous learning.',
    scale: {
      1: 'Resistant to change and new methodologies',
      2: 'Adopts new tools when instructed',
      3: 'Regularly identifies process improvements and implements optimizations',
      4: 'Pioneers innovative workflows and tools that boost productivity',
      5: 'Drives breakthrough innovations that define company strategy',
    },
  },
];

export async function GET(request: Request) {
  try {
    const user = await requireEmployee();
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId') || user.id;
    const cycleId = url.searchParams.get('cycleId');

    const org = await db.organizations.findFirst({ select: { id: true } });
    const orgId = org?.id || 'org_default';

    // Fetch competencies and assessments
    let competencies = await db.performance_competencies.findMany({
      where: { organization_id: orgId, is_active: true },
    });

    // Auto-seed if empty. skipDuplicates makes this idempotent and safe under
    // concurrency: two simultaneous requests (or a pre-existing row from
    // another org with the same deterministic id) previously crashed the
    // endpoint with P2002 unique-constraint violations. createMany also
    // replaces a sequential await loop with a single round trip.
    if (competencies.length === 0) {
      await db.performance_competencies.createMany({
        data: DEFAULT_COMPETENCIES.map((c) => ({
          id: `COMP-${c.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}`,
          organization_id: orgId,
          name: c.name,
          description: c.description,
          scale: c.scale as Prisma.InputJsonValue,
          is_active: true,
        })),
        skipDuplicates: true,
      });
      competencies = await db.performance_competencies.findMany({
        where: { organization_id: orgId, is_active: true },
      });
    }

    const assessments = await db.performance_competency_assessments.findMany({
      where: {
        employee_id: employeeId,
        ...(cycleId ? { cycle_id: cycleId } : {}),
      },
      include: {
        performance_competencies: true,
        employees_performance_competency_assessments_assessor_idToemployees: {
          select: { id: true, name: true, employeeCode: true, roleTitle: true },
        },
      },
      orderBy: { assessed_at: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        competencies,
        assessments,
      },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching competencies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch competencies' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireEmployee();
    const body = await request.json();
    const { action } = body;

    // 1. SUBMIT COMPETENCY ASSESSMENT
    if (action === 'submit_assessment' || !action) {
      const { competencyId, employeeId, cycleId, rating, comments } = body;

      if (!competencyId || !employeeId) {
        return NextResponse.json({ success: false, error: 'Missing competencyId or employeeId' }, { status: 400 });
      }

      await requireEmployeeAccess(employeeId);

      const ratingVal = Math.min(5, Math.max(1, Number(rating) || 3));

      const assessmentId = `COMP-ASSESS-${employeeId}-${competencyId}-${Date.now().toString(36)}`;

      const assessment = await db.performance_competency_assessments.create({
        data: {
          id: assessmentId,
          competency_id: competencyId,
          employee_id: employeeId,
          assessor_id: user.id,
          cycle_id: cycleId || null,
          rating: ratingVal,
          comments: comments || null,
          assessed_at: new Date(),
        },
        include: { performance_competencies: true },
      });

      await db.auditLog.create({
        data: {
          id: `audit-${Date.now()}`,
          action: 'ASSESS_COMPETENCY',
          module: 'Competencies',
          employeeId,
          details: JSON.stringify({ assessorId: user.id, competencyId, rating: ratingVal }),
        },
      });

      return NextResponse.json({ success: true, data: assessment }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error submitting competency assessment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process competency assessment' },
      { status: 500 }
    );
  }
}
