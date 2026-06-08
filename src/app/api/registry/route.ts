import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import {
  SEPARATED_STUDENT_STATUSES,
  STUDENT_TRANSITION_DECISION_LABELS,
  StudentTransitionDecision,
} from '@/types';

const BOUNDARY_YEAR_LEVELS = ['Grade 6', 'Grade 10', 'Grade 12'];
const SEPARATED_OUTCOMES = [
  'COMPLETED_JHS',
  'GRADUATED_SHS',
  'GRADUATED_COLLEGE',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
];
const OUTCOME_LABELS: Record<string, string> = {
  COMPLETED_JHS: 'Completed JHS',
  GRADUATED_SHS: 'Graduated SHS',
  GRADUATED_COLLEGE: 'Graduated College',
  TRANSFERRED_OUT: 'Transferred Out',
  PENDING_DECISION: 'Pending Decision',
  READY_FOR_PROMOTION: 'Ready for Promotion',
};

function formatDecision(decision?: string | null) {
  if (!decision) return 'No decision recorded';
  return (
    STUDENT_TRANSITION_DECISION_LABELS[decision as StudentTransitionDecision] ||
    decision.replace(/_/g, ' ')
  );
}

function formatOutcome(outcome: string) {
  if (OUTCOME_LABELS[outcome]) return OUTCOME_LABELS[outcome];
  return outcome
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function matchesSearch(row: RegistryRow, search: string) {
  if (!search) return true;
  const needle = normalizeText(search);
  return [
    row.studentName,
    row.program,
    row.fromLevel,
    row.toLevel,
    row.outcome,
    row.decisionLabel,
    row.academicYear,
  ].some((value) => normalizeText(value || '').includes(needle));
}

function isSeparatedOutcome(outcome?: string | null) {
  return !!outcome && SEPARATED_OUTCOMES.includes(outcome);
}

function isSeparatedStatus(status?: string | null) {
  return !!status && (SEPARATED_STUDENT_STATUSES as readonly string[]).includes(status);
}

function getSeparatedOutcome(student: {
  status: string;
  graduationStatus?: string | null;
  gradeLevel: string;
  yearLevel: string;
}) {
  const status = isSeparatedStatus(student.status)
    ? student.status
    : isSeparatedStatus(student.graduationStatus)
      ? student.graduationStatus!
      : student.status;

  if (status === 'Completed JHS') return 'COMPLETED_JHS';
  if (status === 'Graduated SHS') return 'GRADUATED_SHS';
  if (status === 'Transferred Out') return 'TRANSFERRED_OUT';
  if (status === 'Withdrawn') return 'WITHDRAWN';
  if (status === 'Graduated' && student.yearLevel === 'Grade 10') return 'COMPLETED_JHS';
  if (status === 'Graduated' && student.yearLevel === 'Grade 12') return 'GRADUATED_SHS';
  if (status === 'Graduated' && student.gradeLevel === 'COLLEGE') return 'GRADUATED_COLLEGE';
  return status;
}

type RegistryRow = {
  id: string;
  studentId: number;
  studentName: string;
  program: string;
  academicYear: string;
  fromLevel: string;
  toLevel: string;
  outcome: string;
  decision: string | null;
  decisionLabel: string;
  status: string;
  separatedAt: Date | null;
  recordedAt: Date | null;
  lane: 'grade-school-to-jhs' | 'jhs-to-shs' | 'shs-to-college' | 'separated' | 'other';
  canDecide: boolean;
  requiresDecision: boolean;
};

function getBoundaryLane(yearLevel: string) {
  if (yearLevel === 'Grade 6') return 'grade-school-to-jhs';
  if (yearLevel === 'Grade 10') return 'jhs-to-shs';
  if (yearLevel === 'Grade 12') return 'shs-to-college';
  return 'other';
}

// GET /api/registry - Comprehensive year-end transition and separated-student registry
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100);
    const search = searchParams.get('search') || '';
    const lane = searchParams.get('lane') || 'all';
    const status = searchParams.get('status') || 'all';
    const skip = (page - 1) * limit;

    const [records, separatedStudents, currentBoundaryStudents] = await Promise.all([
      prisma.studentAcademicRecord.findMany({
        where: {
          OR: [
            { yearLevel: { in: BOUNDARY_YEAR_LEVELS } },
            { outcome: { in: SEPARATED_OUTCOMES } },
          ],
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              program: true,
              status: true,
              separatedAt: true,
            },
          },
        },
        orderBy: [{ endedAt: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.student.findMany({
        where: {
          isArchived: false,
          OR: [
            { status: { in: [...SEPARATED_STUDENT_STATUSES] } },
            { graduationStatus: { in: [...SEPARATED_STUDENT_STATUSES] } },
          ],
        },
        include: {
          academicRecords: {
            orderBy: [{ endedAt: 'desc' }, { createdAt: 'desc' }],
            take: 1,
          },
        },
        orderBy: [{ separatedAt: 'desc' }, { updatedAt: 'desc' }],
      }),
      prisma.student.findMany({
        where: {
          isArchived: false,
          yearLevel: { in: BOUNDARY_YEAR_LEVELS },
          NOT: {
            OR: [
              { status: { in: [...SEPARATED_STUDENT_STATUSES] } },
              { graduationStatus: { in: [...SEPARATED_STUDENT_STATUSES] } },
            ],
          },
        },
        include: {
          academicRecords: {
            orderBy: [{ endedAt: 'desc' }, { createdAt: 'desc' }],
            take: 1,
          },
        },
        orderBy: [{ yearLevel: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
      }),
    ]);

    const rowsFromRecords: RegistryRow[] = records.map((record) => {
      const toLevel =
        record.nextGradeLevel && record.nextYearLevel
          ? `${record.nextGradeLevel} - ${record.nextYearLevel}`
          : record.outcome || record.status;
      const boundaryLane = getBoundaryLane(record.yearLevel);
      const laneFromRecord =
        boundaryLane !== 'other'
          ? boundaryLane
          : isSeparatedOutcome(record.outcome)
            ? 'separated'
            : 'other';

      return {
        id: `record-${record.id}`,
        studentId: record.studentId,
        studentName: `${record.student.lastName}, ${record.student.firstName}`,
        program: record.program || record.student.program,
        academicYear: record.academicYear,
        fromLevel: `${record.gradeLevel} - ${record.yearLevel}`,
        toLevel,
        outcome: record.outcome || 'RECORDED',
        decision: record.decision,
        decisionLabel: formatDecision(record.decision),
        status: record.student.status,
        separatedAt: record.student.separatedAt,
        recordedAt: record.endedAt || record.createdAt,
        lane: laneFromRecord,
        canDecide: false,
        requiresDecision: false,
      };
    });

    const studentsWithSeparatedRecords = new Set(
      records
        .filter((record) => isSeparatedOutcome(record.outcome))
        .map((record) => record.studentId)
    );
    const studentsWithRegistryRows = new Set(records.map((record) => record.studentId));

    const currentBoundaryRows: RegistryRow[] = currentBoundaryStudents
      .filter((student) => !studentsWithRegistryRows.has(student.id))
      .map((student) => {
        const latestRecord = student.academicRecords[0];
        const laneFromStudent = getBoundaryLane(student.yearLevel);
        const isGradeSixBoundary = student.yearLevel === 'Grade 6';

        return {
          id: `current-${student.id}`,
          studentId: student.id,
          studentName: `${student.lastName}, ${student.firstName}`,
          program: student.program,
          academicYear: latestRecord?.academicYear || 'Current record',
          fromLevel: `${student.gradeLevel} - ${student.yearLevel}`,
          toLevel: isGradeSixBoundary
            ? 'Junior High - Grade 7'
            : student.transitionDecision
              ? formatDecision(student.transitionDecision)
              : 'Pending decision',
          outcome:
            isGradeSixBoundary || student.transitionDecision
              ? 'READY_FOR_PROMOTION'
              : 'PENDING_DECISION',
          decision: student.transitionDecision,
          decisionLabel: isGradeSixBoundary
            ? 'Automatic promotion'
            : formatDecision(student.transitionDecision),
          status: student.status,
          separatedAt: student.separatedAt,
          recordedAt: student.transitionDecisionAt || latestRecord?.createdAt || student.updatedAt,
          lane: laneFromStudent,
          canDecide: !isGradeSixBoundary,
          requiresDecision: !isGradeSixBoundary && !student.transitionDecision,
        };
      });

    const fallbackSeparatedRows: RegistryRow[] = separatedStudents
      .filter((student) => !studentsWithSeparatedRecords.has(student.id))
      .map((student) => {
        const latestRecord = student.academicRecords[0];
        const outcome = getSeparatedOutcome(student);
        return {
          id: `student-${student.id}`,
          studentId: student.id,
          studentName: `${student.lastName}, ${student.firstName}`,
          program: student.program,
          academicYear: latestRecord?.academicYear || 'Current record',
          fromLevel: `${student.gradeLevel} - ${student.yearLevel}`,
          toLevel: formatOutcome(outcome),
          outcome,
          decision: student.transitionDecision,
          decisionLabel: formatDecision(student.transitionDecision),
          status: outcome,
          separatedAt: student.separatedAt,
          recordedAt: student.separatedAt || student.updatedAt,
          lane: 'separated',
          canDecide: false,
          requiresDecision: false,
        };
      });

    const allRows = [...rowsFromRecords, ...currentBoundaryRows, ...fallbackSeparatedRows].sort(
      (a, b) => {
        const aTime = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
        const bTime = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
        return bTime - aTime || a.studentName.localeCompare(b.studentName);
      }
    );

    const stats = {
      total: allRows.length,
      gradeSchoolToJhs: allRows.filter((row) => row.lane === 'grade-school-to-jhs').length,
      jhsToShs: allRows.filter((row) => row.lane === 'jhs-to-shs').length,
      shsToCollege: allRows.filter((row) => row.lane === 'shs-to-college').length,
      separated: allRows.filter((row) => row.lane === 'separated').length,
      transferred: allRows.filter((row) => row.outcome === 'TRANSFERRED_OUT').length,
      withdrawn: allRows.filter((row) => row.outcome === 'WITHDRAWN').length,
    };

    const filteredRows = allRows.filter((row) => {
      const laneMatch = lane === 'all' || row.lane === lane;
      const statusMatch = status === 'all' || row.status === status || row.outcome === status;
      return laneMatch && statusMatch && matchesSearch(row, search);
    });

    return NextResponse.json({
      success: true,
      data: filteredRows.slice(skip, skip + limit),
      stats,
      total: filteredRows.length,
      page,
      limit,
      totalPages: Math.max(Math.ceil(filteredRows.length / limit), 1),
    });
  } catch (error) {
    console.error('Error fetching registry:', error);
    const message =
      error instanceof Error &&
      (error.message.includes('student_academic_records') ||
        error.message.includes('transition_decision') ||
        error.message.includes('separated_at'))
        ? 'Registry database migration is pending. Run prisma migrate deploy to enable the registry.'
        : 'Failed to fetch registry';

    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
