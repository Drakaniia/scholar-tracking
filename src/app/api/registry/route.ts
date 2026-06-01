import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import {
  SEPARATED_STUDENT_STATUSES,
  STUDENT_TRANSITION_DECISION_LABELS,
  StudentTransitionDecision,
} from '@/types';

const BOUNDARY_YEAR_LEVELS = ['Grade 10', 'Grade 12'];
const SEPARATED_OUTCOMES = [
  'COMPLETED_JHS',
  'GRADUATED_SHS',
  'GRADUATED_COLLEGE',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
];

function formatDecision(decision?: string | null) {
  if (!decision) return 'No decision recorded';
  return (
    STUDENT_TRANSITION_DECISION_LABELS[decision as StudentTransitionDecision] ||
    decision.replace(/_/g, ' ')
  );
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
  lane: 'jhs-to-shs' | 'shs-to-college' | 'separated' | 'other';
};

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

    const [records, separatedStudents] = await Promise.all([
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
    ]);

    const rowsFromRecords: RegistryRow[] = records.map((record) => {
      const toLevel =
        record.nextGradeLevel && record.nextYearLevel
          ? `${record.nextGradeLevel} - ${record.nextYearLevel}`
          : record.outcome || record.status;
      const laneFromRecord =
        record.yearLevel === 'Grade 10'
          ? 'jhs-to-shs'
          : record.yearLevel === 'Grade 12'
            ? 'shs-to-college'
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
      };
    });

    const studentsWithSeparatedRecords = new Set(
      records
        .filter((record) => isSeparatedOutcome(record.outcome))
        .map((record) => record.studentId)
    );

    const fallbackSeparatedRows: RegistryRow[] = separatedStudents
      .filter((student) => !studentsWithSeparatedRecords.has(student.id))
      .map((student) => {
        const latestRecord = student.academicRecords[0];
        return {
          id: `student-${student.id}`,
          studentId: student.id,
          studentName: `${student.lastName}, ${student.firstName}`,
          program: student.program,
          academicYear: latestRecord?.academicYear || 'Current record',
          fromLevel: `${student.gradeLevel} - ${student.yearLevel}`,
          toLevel: student.status,
          outcome: student.status,
          decision: student.transitionDecision,
          decisionLabel: formatDecision(student.transitionDecision),
          status: student.status,
          separatedAt: student.separatedAt,
          recordedAt: student.separatedAt || student.updatedAt,
          lane: 'separated',
        };
      });

    const allRows = [...rowsFromRecords, ...fallbackSeparatedRows].sort((a, b) => {
      const aTime = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
      const bTime = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
      return bTime - aTime || a.studentName.localeCompare(b.studentName);
    });

    const stats = {
      total: allRows.length,
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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch registry' },
      { status: 500 }
    );
  }
}
