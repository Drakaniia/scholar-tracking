import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildSearchWhere } from '@/lib/query-optimizer';
import { queryOptimizer } from '@/lib/query-optimizer';
import { SEPARATED_STUDENT_STATUSES } from '@/types';

type BulkArchiveResult = {
  studentId: number;
  studentName: string;
  success: boolean;
  error?: string;
};

type ArchiveAction = 'archive' | 'unarchive';

type BulkArchiveFilters = {
  search?: string;
  gradeLevel?: string;
  program?: string;
  status?: string;
  scholarshipSource?: string;
  scholarshipId?: string;
  academicYearId?: string | number;
  archived?: boolean;
  population?: string;
};

type ParsedBody =
  | { success: true; mode: 'ids'; action: ArchiveAction; ids: number[] }
  | { success: true; mode: 'selectAll'; action: ArchiveAction; filters: BulkArchiveFilters }
  | { success: false; error: string; status: number };

function parseAction(value: unknown): ArchiveAction {
  if (value === 'unarchive') return 'unarchive';
  return 'archive';
}

async function parseBulkArchiveBody(request: NextRequest): Promise<ParsedBody> {
  try {
    const body = await request.json();
    const action = parseAction(body.action);

    if (body.selectAll === true) {
      const filters = body.filters as BulkArchiveFilters | undefined;
      if (!filters || typeof filters !== 'object') {
        return { success: false, error: 'filters object required when selectAll is true', status: 400 };
      }
      return { success: true, mode: 'selectAll', action, filters };
    }

    const studentIds = body.studentIds as unknown;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return {
        success: false,
        error: 'studentIds must be a non-empty array',
        status: 400,
      };
    }

    const ids = studentIds.map((id: unknown) => Number(id));
    if (ids.some((id: number) => !Number.isInteger(id) || id <= 0)) {
      return {
        success: false,
        error: 'Each student ID must be a positive integer',
        status: 400,
      };
    }

    return { success: true, mode: 'ids', action, ids };
  } catch {
    return { success: false, error: 'Invalid request body', status: 400 };
  }
}

function parseOptionalAcademicYearId(value: unknown): number | null {
  if (value === undefined || value === null || value === '' || value === 'all') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

function buildArchiveWhereClause(filters: BulkArchiveFilters, isUnarchive: boolean) {
  const { gradeLevel = '', program = '', status = '', search = '', scholarshipId = '', scholarshipSource = '', academicYearId, population = 'active' } = filters;
  const academicYearFilter = parseOptionalAcademicYearId(academicYearId);

  const additionalFilters: Record<string, unknown> = {
    isArchived: isUnarchive,
  };
  if (gradeLevel) additionalFilters.gradeLevel = gradeLevel;
  if (program) additionalFilters.program = program;
  if (status) additionalFilters.status = status;
  if (!status && population === 'active') additionalFilters.status = 'Active';
  if (population === 'separated') {
    additionalFilters.OR = [
      { status: { in: [...SEPARATED_STUDENT_STATUSES] } },
      { graduationStatus: { in: [...SEPARATED_STUDENT_STATUSES] } },
    ];
  }

  const where = buildSearchWhere(search, ['lastName', 'firstName', 'program'], additionalFilters);

  if (scholarshipId) {
    if (scholarshipId === 'none') {
      Object.assign(where, { scholarships: { none: {} } });
    } else {
      Object.assign(where, { scholarships: { some: { scholarshipId: parseInt(scholarshipId) } } });
    }
  }

  if (scholarshipSource) {
    Object.assign(where, { scholarships: { some: { scholarship: { source: scholarshipSource } } } });
  }

  if (academicYearFilter) {
    Object.assign(where, { academicYearId: academicYearFilter });
  }

  return where;
}

async function processByIds(ids: number[], action: ArchiveAction) {
  const isUnarchive = action === 'unarchive';
  const existingStudents = await prisma.student.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, isArchived: true },
  });

  const existingMap = new Map(existingStudents.map((s) => [s.id, s]));
  const results: BulkArchiveResult[] = [];
  let processedCount = 0;
  let alreadyInStateCount = 0;
  let notFoundCount = 0;

  for (const studentId of ids) {
    const student = existingMap.get(studentId);

    if (!student) {
      results.push({ studentId, studentName: 'Unknown', success: false, error: 'Student not found' });
      notFoundCount++;
      continue;
    }

    if (isUnarchive && !student.isArchived) {
      results.push({
        studentId,
        studentName: `${student.lastName}, ${student.firstName}`,
        success: false,
        error: 'Student is not archived',
      });
      alreadyInStateCount++;
      continue;
    }
    if (!isUnarchive && student.isArchived) {
      results.push({
        studentId,
        studentName: `${student.lastName}, ${student.firstName}`,
        success: false,
        error: 'Student is already archived',
      });
      alreadyInStateCount++;
      continue;
    }

    try {
      await prisma.student.update({
        where: { id: studentId },
        data: { isArchived: !isUnarchive },
      });
      results.push({
        studentId,
        studentName: `${student.lastName}, ${student.firstName}`,
        success: true,
      });
      processedCount++;
    } catch (error) {
      results.push({
        studentId,
        studentName: `${student.lastName}, ${student.firstName}`,
        success: false,
        error: error instanceof Error ? error.message : `Failed to ${action} student`,
      });
    }
  }

  return { results, processedCount, alreadyInStateCount, notFoundCount };
}

async function processByFilters(filters: BulkArchiveFilters, action: ArchiveAction) {
  const isUnarchive = action === 'unarchive';
  const where = buildArchiveWhereClause(filters, isUnarchive);

  const studentsToProcess = await prisma.student.findMany({
    where,
    select: { id: true, firstName: true, lastName: true },
  });

  if (studentsToProcess.length === 0) {
    return { results: [] as BulkArchiveResult[], processedCount: 0, alreadyInStateCount: 0, notFoundCount: 0 };
  }

  const results: BulkArchiveResult[] = [];
  let processedCount = 0;

  for (const student of studentsToProcess) {
    try {
      await prisma.student.update({
        where: { id: student.id },
        data: { isArchived: !isUnarchive },
      });
      results.push({
        studentId: student.id,
        studentName: `${student.lastName}, ${student.firstName}`,
        success: true,
      });
      processedCount++;
    } catch (error) {
      results.push({
        studentId: student.id,
        studentName: `${student.lastName}, ${student.firstName}`,
        success: false,
        error: error instanceof Error ? error.message : `Failed to ${action} student`,
      });
    }
  }

  return { results, processedCount, alreadyInStateCount: 0, notFoundCount: 0 };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const parsed = await parseBulkArchiveBody(request);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: parsed.status });
    }

    let result: Awaited<ReturnType<typeof processByIds>>;
    if (parsed.mode === 'selectAll') {
      result = await processByFilters(parsed.filters, parsed.action);
    } else {
      result = await processByIds(parsed.ids, parsed.action);
    }

    const { results, processedCount, alreadyInStateCount, notFoundCount } = result;

    queryOptimizer.invalidatePattern('students-list');
    queryOptimizer.invalidatePattern('dashboard');

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;
    const actionLabel = parsed.action === 'unarchive' ? 'unarchived' : 'archived';

    return NextResponse.json({
      success: errorCount === 0,
      data: {
        totalProcessed: results.length,
        processedCount,
        alreadyInStateCount,
        notFoundCount,
        successCount,
        errorCount,
        action: parsed.action,
        results,
      },
      message:
        errorCount === 0
          ? `${processedCount} student(s) ${actionLabel} successfully`
          : `${processedCount} student(s) ${actionLabel}, ${errorCount} issue(s)`,
    });
  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json({ success: false, error: 'Failed to process bulk operation' }, { status: 500 });
  }
}
