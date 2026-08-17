import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  authAccessErrorResponse,
  isAuthAccessError,
} from '@/lib/auth-session';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');

    const [allSkills, employeeSkills] = await Promise.all([
      db.skillMaster.findMany({
        orderBy: { name: 'asc' },
      }),
      db.employeeSkill.findMany({
        where: employeeId ? { employeeId } : {},
        include: { skill: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { allSkills, employeeSkills },
    });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error fetching skills data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch skills data' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, skillId, skillName, category, proficiency = 'Intermediate', yearsExp = 2.0 } = body;

    if (!employeeId) {
      return NextResponse.json(
        { success: false, error: 'Employee ID is required.' },
        { status: 400 }
      );
    }

    let targetSkillId = skillId;
    if (!targetSkillId && skillName) {
      const skillRecord = await db.skillMaster.upsert({
        where: { name: skillName },
        update: {},
        create: {
          id: `SKL-${Date.now().toString(36)}`,
          name: skillName,
          category: category || 'Engineering',
        },
      });
      targetSkillId = skillRecord.id;
    }

    const record = await db.employeeSkill.upsert({
      where: {
        employeeId_skillId: {
          employeeId,
          skillId: targetSkillId,
        },
      },
      update: {
        proficiency,
        yearsExp: Number(yearsExp),
        verified: true,
      },
      create: {
        id: `emp-skl-${Date.now().toString(36)}`,
        employeeId,
        skillId: targetSkillId,
        proficiency,
        yearsExp: Number(yearsExp),
        verified: true,
      },
      include: { skill: true },
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    if (isAuthAccessError(error)) return authAccessErrorResponse(error);
    console.error('Error updating employee skill:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update employee skill' },
      { status: 500 }
    );
  }
}
