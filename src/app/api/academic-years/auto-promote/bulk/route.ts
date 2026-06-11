import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { promoteSelectedStudents } from '@/lib/academic-year-service';
import { verifyToken } from '@/lib/auth';
import { isStudentTransitionDecision } from '@/lib/promotion-decisions';
import type { StudentTransitionDecision } from '@/types';

const MAX_BULK_PROMOTION_STUDENTS = 500;

function getUnexpectedPromotionError(error: unknown) {
  const detail = error instanceof Error && error.message ? error.message : 'Unknown server error.';
  return `Promotion failed before processing could finish: ${detail}. Resolve the issue shown here, then refresh the promotion list and try again.`;
}

export async function POST(request: NextRequest) {
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
    const rawStudentIds: unknown[] = Array.isArray(body?.studentIds) ? body.studentIds : [];
    const rawCohortStudentIds: unknown[] = Array.isArray(body?.cohortStudentIds)
      ? body.cohortStudentIds
      : rawStudentIds;
    const rawTransitionDecisions: unknown[] = Array.isArray(body?.transitionDecisions)
      ? body.transitionDecisions
      : [];

    if (rawCohortStudentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No students are available in the promotion list.' },
        { status: 400 }
      );
    }

    if (rawCohortStudentIds.length > MAX_BULK_PROMOTION_STUDENTS) {
      return NextResponse.json(
        {
          success: false,
          error: `Bulk promotion is limited to ${MAX_BULK_PROMOTION_STUDENTS} students at a time.`,
        },
        { status: 400 }
      );
    }

    const studentIds = rawStudentIds.map((studentId) => Number(studentId));
    const cohortStudentIds = rawCohortStudentIds.map((studentId) => Number(studentId));
    const hasInvalidStudentId = [...studentIds, ...cohortStudentIds].some(
      (studentId) => !Number.isInteger(studentId) || studentId <= 0
    );
    if (hasInvalidStudentId) {
      return NextResponse.json(
        { success: false, error: 'Invalid student selection payload.' },
        { status: 400 }
      );
    }

    const cohortSet = new Set(cohortStudentIds);
    if (studentIds.some((studentId) => !cohortSet.has(studentId))) {
      return NextResponse.json(
        { success: false, error: 'Selected students must belong to the current promotion list.' },
        { status: 400 }
      );
    }

    const selectedSet = new Set(studentIds);
    const transitionDecisionMap = new Map<number, StudentTransitionDecision>();
    for (const transitionDecision of rawTransitionDecisions) {
      if (
        typeof transitionDecision !== 'object' ||
        transitionDecision === null ||
        !('studentId' in transitionDecision) ||
        !('decision' in transitionDecision)
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid transition decision payload.' },
          { status: 400 }
        );
      }

      const studentId = Number(transitionDecision.studentId);
      const decision = transitionDecision.decision;
      if (
        !Number.isInteger(studentId) ||
        studentId <= 0 ||
        typeof decision !== 'string' ||
        !isStudentTransitionDecision(decision)
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid transition decision payload.' },
          { status: 400 }
        );
      }

      if (!selectedSet.has(studentId)) {
        return NextResponse.json(
          {
            success: false,
            error: 'Transition decision students must be selected for promotion.',
          },
          { status: 400 }
        );
      }

      transitionDecisionMap.set(studentId, decision);
    }

    const result =
      transitionDecisionMap.size > 0
        ? await promoteSelectedStudents(
            studentIds,
            payload.id,
            undefined,
            cohortStudentIds,
            transitionDecisionMap
          )
        : await promoteSelectedStudents(studentIds, payload.id, undefined, cohortStudentIds);
    const processedCount = result.promotedCount + result.archivedCount;

    return NextResponse.json(
      {
        success: result.success,
        message: result.success
          ? `Processed ${processedCount} student(s): ${result.promotedCount} promoted and ${result.archivedCount} archived.`
          : result.error || 'No selected students were processed.',
        data: result,
        error: result.success ? undefined : result.error,
      },
      { status: result.success ? 200 : 400 }
    );
  } catch (error) {
    console.error('Error in selected student promotion:', error);
    return NextResponse.json(
      {
        success: false,
        error: getUnexpectedPromotionError(error),
      },
      { status: 500 }
    );
  }
}
