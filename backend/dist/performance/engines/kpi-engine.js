"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAttendanceKpi = calculateAttendanceKpi;
exports.calculateLmsTrainingKpi = calculateLmsTrainingKpi;
exports.calculateTimesheetKpi = calculateTimesheetKpi;
exports.syncEmployeeKpis = syncEmployeeKpis;
async function calculateAttendanceKpi(prisma, employeeId, startDate, endDate) {
    const records = await prisma.attendanceRecord.findMany({
        where: {
            employeeId,
            ...(startDate && endDate
                ? {
                    createdAt: {
                        gte: startDate,
                        lte: endDate,
                    },
                }
                : {}),
        },
        take: 90,
    });
    const total = records.length;
    if (total === 0) {
        return {
            name: 'Attendance & Punctuality Rate',
            metric: 'Percentage of on-time check-ins over the cycle period',
            target: 95,
            actual: 100,
            unit: '%',
            achievementPercentage: 100,
            sourceModule: 'Attendance',
            isSystemCalculated: true,
            metadata: { totalRecords: 0, onTimeCount: 0, note: 'No attendance records logged in cycle; defaulted to 100%' },
        };
    }
    const onTimeCount = records.filter((r) => r.status === 'OnTime' || r.status === 'OnLeave').length;
    const actual = Math.min(100, Math.round((onTimeCount / total) * 100 * 10) / 10);
    const target = 95;
    const achievement = Math.min(150, Math.round((actual / target) * 100));
    return {
        name: 'Attendance & Punctuality Rate',
        metric: 'Percentage of on-time check-ins over the cycle period',
        target,
        actual,
        unit: '%',
        achievementPercentage: achievement,
        sourceModule: 'Attendance',
        isSystemCalculated: true,
        metadata: { totalDaysRecorded: total, onTimeDays: onTimeCount },
    };
}
async function calculateLmsTrainingKpi(prisma, employeeId) {
    const enrollments = await prisma.employeeCourseEnrollment.findMany({
        where: { employeeId },
        include: { course: true },
    });
    if (enrollments.length === 0) {
        return {
            name: 'Compliance & Skills Training Completion',
            metric: 'Percentage of assigned corporate learning courses completed',
            target: 100,
            actual: 100,
            unit: '%',
            achievementPercentage: 100,
            sourceModule: 'LMS',
            isSystemCalculated: true,
            metadata: { assignedCourses: 0, completedCourses: 0 },
        };
    }
    const completed = enrollments.filter((e) => e.status === 'Completed').length;
    const actual = Math.round((completed / enrollments.length) * 100);
    const target = 100;
    const achievement = Math.min(150, Math.round((actual / target) * 100));
    return {
        name: 'Compliance & Skills Training Completion',
        metric: 'Percentage of assigned corporate learning courses completed',
        target,
        actual,
        unit: '%',
        achievementPercentage: achievement,
        sourceModule: 'LMS',
        isSystemCalculated: true,
        metadata: {
            totalAssigned: enrollments.length,
            completedCount: completed,
            courses: enrollments.map((e) => ({ title: e.course.title, status: e.status })),
        },
    };
}
async function calculateTimesheetKpi(prisma, employeeId) {
    const sheets = await prisma.timesheets.findMany({
        where: { employee_id: employeeId },
        take: 30,
    });
    if (sheets.length === 0) {
        return {
            name: 'Timesheet & Billable Hours Compliance',
            metric: 'Percentage of logged hours meeting expected billable targets',
            target: 90,
            actual: 90,
            unit: '%',
            achievementPercentage: 100,
            sourceModule: 'Timesheet',
            isSystemCalculated: true,
            metadata: { totalTimesheets: 0 },
        };
    }
    const totalExpected = sheets.reduce((acc, s) => acc + (s.expected_minutes || 480), 0);
    const totalLogged = sheets.reduce((acc, s) => acc + s.logged_minutes, 0);
    const actual = totalExpected > 0 ? Math.min(100, Math.round((totalLogged / totalExpected) * 100)) : 100;
    const target = 90;
    const achievement = Math.min(150, Math.round((actual / target) * 100));
    return {
        name: 'Timesheet & Billable Hours Compliance',
        metric: 'Percentage of logged hours meeting expected billable targets',
        target,
        actual,
        unit: '%',
        achievementPercentage: achievement,
        sourceModule: 'Timesheet',
        isSystemCalculated: true,
        metadata: {
            timesheetsCount: sheets.length,
            totalExpectedHours: Math.round(totalExpected / 60),
            totalLoggedHours: Math.round(totalLogged / 60),
        },
    };
}
async function syncEmployeeKpis(prisma, organizationId, employeeId, cycleId) {
    const [attendanceKpi, lmsKpi, timesheetKpi] = await Promise.all([
        calculateAttendanceKpi(prisma, employeeId),
        calculateLmsTrainingKpi(prisma, employeeId),
        calculateTimesheetKpi(prisma, employeeId),
    ]);
    const kpiDefinitions = [
        { ...attendanceKpi, weightage: 20 },
        { ...lmsKpi, weightage: 20 },
        { ...timesheetKpi, weightage: 20 },
    ];
    const upsertedKpis = [];
    for (const def of kpiDefinitions) {
        const existing = await prisma.performance_kpis.findFirst({
            where: {
                employee_id: employeeId,
                name: def.name,
                ...(cycleId ? { cycle_id: cycleId } : {}),
            },
        });
        if (existing) {
            const updated = await prisma.performance_kpis.update({
                where: { id: existing.id },
                data: {
                    actual: def.actual,
                    metric: def.metric,
                    target: def.target,
                    unit: def.unit,
                    is_system_calculated: true,
                    source_module: def.sourceModule,
                    calculation_metadata: def.metadata,
                    last_calculated_at: new Date(),
                },
            });
            upsertedKpis.push(updated);
        }
        else {
            const created = await prisma.performance_kpis.create({
                data: {
                    id: `KPI-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
                    organization_id: organizationId,
                    employee_id: employeeId,
                    cycle_id: cycleId || null,
                    name: def.name,
                    description: def.metric,
                    metric: def.metric,
                    target: def.target,
                    actual: def.actual,
                    unit: def.unit,
                    weightage: def.weightage,
                    frequency: 'Quarterly',
                    source_module: def.sourceModule,
                    is_system_calculated: true,
                    calculation_metadata: def.metadata,
                    last_calculated_at: new Date(),
                },
            });
            upsertedKpis.push(created);
        }
    }
    return upsertedKpis;
}
//# sourceMappingURL=kpi-engine.js.map