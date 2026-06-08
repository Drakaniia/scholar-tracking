import { cookies } from 'next/headers';
import { NextRequest, NextResponse, after } from 'next/server';

import {
  autoPromoteStudents,
  getActiveAcademicYear,
  resolvePromotionTarget,
  undoLastAcademicYearPromotion,
} from '@/lib/academic-year-service';
import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { SEPARATED_STUDENT_STATUSES, STUDENT_TRANSITION_DECISIONS } from '@/types';

const ACTIVE_PROMOTION_STATUSES = ['PENDING', 'PROCESSING'];
const GRADE_10_TRANSITION_DECISIONS = new Set([
  'CONTINUE_SENIOR_HIGH',
  'COMPLETED_JHS',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
  'RETAINED',
]);
const GRADE_12_TRANSITION_DECISIONS = new Set([
  'CONTINUE_COLLEGE',
  'GRADUATED_SHS',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
  'RETAINED',
]);

function getAllowedTransitionDecisions(yearLevel: string) {
  if (yearLevel === 'Grade 10') return GRADE_10_TRANSITION_DECISIONS;
  if (yearLevel === 'Grade 12') return GRADE_12_TRANSITION_DECISIONS;
  return null;
}

function isSeparatedStatus(status?: string | null) {
  return !!status && (SEPARATED_STUDENT_STATUSES as readonly string[]).includes(status);
}

async function getLatestPromotionRun(academicYearId: number) {
  return prisma.promotionRun.findFirst({
    where: { academicYearId },
    orderBy: { startedAt: 'desc' },
  });
}

async function completePromotionRun(runId: number, userId: number, academicYearId: number) {
  try {
    const result = await autoPromoteStudents(userId, academicYearId);

    await prisma.promotionRun.update({
      where: { id: runId },
      data: {
        status: result.success ? 'COMPLETED' : 'FAILED',
        promotedCount: result.promotedCount,
        graduatedCount: result.graduatedCount,
        skippedCount: result.skippedCount,
        errorCount: result.errorCount,
        errorMessage: result.success ? null : result.error || 'Promotion failed',
        errors: result.errors && result.errors.length > 0 ? result.errors : undefined,
        completedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown promotion error';
    console.error('Error completing promotion run:', error);

    await prisma.promotionRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        errorMessage: message,
        errorCount: 1,
        completedAt: new Date(),
      },
    });
  }
}

export async function POST() {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN can trigger auto-promotion
    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const userId = payload.id;

    const activeAcademicYear = await getActiveAcademicYear();
    if (!activeAcademicYear) {
      return NextResponse.json(
        {
          success: false,
          error: 'No active academic year found. Please configure an active academic year first.',
        },
        { status: 400 }
      );
    }

    if (activeAcademicYear.promotionProcessedAt) {
      return NextResponse.json(
        {
          success: false,
          error:
            'This academic year has already been promoted. Undo the last promotion before running it again.',
        },
        { status: 400 }
      );
    }

    const existingRun = await prisma.promotionRun.findFirst({
      where: {
        academicYearId: activeAcademicYear.id,
        status: { in: ACTIVE_PROMOTION_STATUSES },
      },
      orderBy: { startedAt: 'desc' },
    });

    if (existingRun) {
      return NextResponse.json(
        {
          success: true,
          message: 'Promotion is already being processed. You can check the status here.',
          data: { run: existingRun },
        },
        { status: 202 }
      );
    }

    const totalStudents = await prisma.student.count({
      where: {
        isArchived: false,
        graduationStatus: { not: 'Graduated' },
        status: 'Active',
      },
    });

    const run = await prisma.promotionRun.create({
      data: {
        academicYearId: activeAcademicYear.id,
        academicYear: activeAcademicYear.year,
        status: 'PROCESSING',
        source: 'MANUAL',
        requestedBy: userId,
        totalStudents,
      },
    });

    after(() => completePromotionRun(run.id, userId, activeAcademicYear.id));

    return NextResponse.json(
      {
        success: true,
        message:
          'Promotion started. You can leave this page and check the promotion status later in Settings.',
        data: { run },
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Error in auto-promote students:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to promote students',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const rawDecisions = Array.isArray(body?.decisions) ? body.decisions : [];

    if (rawDecisions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one transition decision is required.' },
        { status: 400 }
      );
    }

    const allowedDecisions = new Set<string>(STUDENT_TRANSITION_DECISIONS);
    for (const decision of rawDecisions) {
      if (!Number.isInteger(decision?.studentId) || !allowedDecisions.has(decision?.decision)) {
        return NextResponse.json(
          { success: false, error: 'Invalid transition decision payload.' },
          { status: 400 }
        );
      }
    }

    const decisions = rawDecisions as Array<{ studentId: number; decision: string }>;
    const studentIds = [...new Set(decisions.map((decision) => decision.studentId))];
    const decisionTargets = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
      },
      select: {
        id: true,
        yearLevel: true,
        status: true,
        graduationStatus: true,
        isArchived: true,
      },
    });
    const studentsById = new Map(decisionTargets.map((student) => [student.id, student]));

    for (const decision of decisions) {
      const student = studentsById.get(decision.studentId);

      if (!student) {
        return NextResponse.json(
          { success: false, error: 'Invalid transition decision target.' },
          { status: 400 }
        );
      }

      const allowedForYearLevel = getAllowedTransitionDecisions(student.yearLevel);
      if (
        !allowedForYearLevel ||
        student.isArchived ||
        student.status !== 'Active' ||
        isSeparatedStatus(student.status) ||
        isSeparatedStatus(student.graduationStatus)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: 'Only active Grade 10 and Grade 12 students can receive transition decisions.',
          },
          { status: 400 }
        );
      }

      if (!allowedForYearLevel.has(decision.decision)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid transition decision for ${student.yearLevel}.`,
          },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      decisions.map((decision: { studentId: number; decision: string }) =>
        prisma.student.update({
          where: { id: decision.studentId },
          data: {
            transitionDecision: decision.decision,
            transitionDecisionAt: new Date(),
            transitionDecisionBy: payload.id,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `${decisions.length} transition decision(s) saved.`,
    });
  } catch (error) {
    console.error('Error saving transition decisions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save transition decisions' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const result = await undoLastAcademicYearPromotion(payload.id);

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    if (result.academicYearId) {
      await prisma.promotionRun.updateMany({
        where: {
          academicYearId: result.academicYearId,
          status: { in: ['COMPLETED', 'FAILED'] },
        },
        data: {
          status: 'REVERTED',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Restored ${result.restoredCount} students from the last promotion run`,
      data: result,
    });
  } catch (error) {
    console.error('Error undoing auto-promote students:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to undo student promotion',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('runId');
    const statusOnly = searchParams.get('statusOnly') === 'true';

    if (runId) {
      const run = await prisma.promotionRun.findUnique({
        where: { id: Number(runId) },
      });

      if (!run) {
        return NextResponse.json(
          { success: false, error: 'Promotion run not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { run },
      });
    }

    const activeAcademicYear = await getActiveAcademicYear();
    const latestRun = activeAcademicYear
      ? await getLatestPromotionRun(activeAcademicYear.id)
      : null;

    if (statusOnly) {
      return NextResponse.json({
        success: true,
        data: {
          activeAcademicYear,
          latestRun,
        },
      });
    }

    const students = await prisma.student.findMany({
      where: {
        isArchived: false,
        graduationStatus: { not: 'Graduated' },
        status: 'Active',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        yearLevel: true,
        program: true,
        termType: true,
        transitionDecision: true,
      },
    });

    const promotionPreview = students.map((student) => {
      const target = resolvePromotionTarget(student);
      return {
        ...student,
        nextGradeLevel: target.action === 'PROMOTE' ? target.gradeLevel : null,
        nextYearLevel:
          target.action === 'PROMOTE'
            ? target.yearLevel
            : target.action === 'GRADUATE'
              ? 'Graduated'
              : target.action === 'SEPARATE'
                ? target.status
                : target.action === 'RETAIN'
                  ? student.yearLevel
              : null,
        nextProgram: target.action === 'PROMOTE' ? target.program || student.program : null,
        nextTermType: target.action === 'PROMOTE' ? target.termType || student.termType : null,
        action: target.action,
        reason: target.action === 'SKIP' ? target.reason : undefined,
        transitionDecision: student.transitionDecision,
        requiresDecision:
          target.action === 'SKIP' && target.reason.includes('requires an end-of-year decision'),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        activeAcademicYear,
        latestRun,
        totalStudents: students.length,
        preview: promotionPreview,
      },
    });
  } catch (error) {
    console.error('Error fetching promotion preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotion preview' },
      { status: 500 }
    );
  }
}
