import type { Prisma } from '@prisma/client';

import { GradeLevel, TermType } from '@/types';

import { logAudit } from './auth';
import prisma from './prisma';

export const UNDECLARED_COLLEGE_PROGRAM = 'Undeclared College Program';

export interface PromotionStudentInput {
  gradeLevel: string;
  yearLevel: string;
  program?: string;
  termType?: string;
}

export type PromotionTarget =
  | {
      action: 'PROMOTE';
      gradeLevel: GradeLevel;
      yearLevel: string;
      program?: string;
      termType?: TermType;
    }
  | {
      action: 'GRADUATE';
    }
  | {
      action: 'SKIP';
      reason: string;
    };

interface AcademicYearPromotionRecord {
  id: number;
  year: string;
  semester: string;
  promotionDate?: Date | null;
  promotionProcessedAt?: Date | null;
}

interface PromotionRunResult {
  success: boolean;
  error?: string;
  promotedCount: number;
  graduatedCount: number;
  skippedCount: number;
  errorCount: number;
  errors?: Array<{ studentId?: number; error: string }>;
}

interface AcademicYearPromotionResult extends PromotionRunResult {
  academicYearId: number;
  academicYear: string;
  skippedAcademicYear: boolean;
}

export interface DuePromotionRunResult extends PromotionRunResult {
  processedAcademicYears: number;
  results: AcademicYearPromotionResult[];
}

function parseGradeNumber(yearLevel: string): number | null {
  const match = yearLevel.trim().match(/^Grade\s+(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function parseCollegeYearNumber(yearLevel: string): number | null {
  const match = yearLevel.trim().match(/^(\d+)(st|nd|rd|th)\s+Year$/i);
  return match ? Number(match[1]) : null;
}

function ordinalCollegeYear(year: number): string {
  if (year === 1) return '1st Year';
  if (year === 2) return '2nd Year';
  if (year === 3) return '3rd Year';
  return `${year}th Year`;
}

export function resolvePromotionTarget(student: PromotionStudentInput): PromotionTarget {
  const currentGrade = parseGradeNumber(student.yearLevel);

  if (currentGrade !== null) {
    if (currentGrade >= 1 && currentGrade <= 5) {
      return {
        action: 'PROMOTE',
        gradeLevel: 'GRADE_SCHOOL',
        yearLevel: `Grade ${currentGrade + 1}`,
      };
    }

    if (currentGrade === 6) {
      return {
        action: 'PROMOTE',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 7',
      };
    }

    if (currentGrade >= 7 && currentGrade <= 9) {
      return {
        action: 'PROMOTE',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: `Grade ${currentGrade + 1}`,
      };
    }

    if (currentGrade === 10) {
      return {
        action: 'PROMOTE',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 11',
      };
    }

    if (currentGrade === 11) {
      return {
        action: 'PROMOTE',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
      };
    }

    if (currentGrade === 12) {
      return {
        action: 'PROMOTE',
        gradeLevel: 'COLLEGE',
        yearLevel: '1st Year',
        termType: 'TRIMESTER',
        program: UNDECLARED_COLLEGE_PROGRAM,
      };
    }
  }

  if (student.gradeLevel === 'COLLEGE') {
    const collegeYear = parseCollegeYearNumber(student.yearLevel);

    if (collegeYear === null) {
      return {
        action: 'SKIP',
        reason: `Unsupported college year level: ${student.yearLevel}`,
      };
    }

    if (collegeYear >= 3) {
      return { action: 'GRADUATE' };
    }

    return {
      action: 'PROMOTE',
      gradeLevel: 'COLLEGE',
      yearLevel: ordinalCollegeYear(collegeYear + 1),
    };
  }

  return {
    action: 'SKIP',
    reason: `Unsupported year level: ${student.yearLevel}`,
  };
}

/**
 * Compatibility helper for callers that only need the next year-level label.
 */
export function getNextYearLevel(
  gradeLevel: string,
  yearLevel: string
): { nextYearLevel: string | null; isGraduating: boolean } {
  const target = resolvePromotionTarget({ gradeLevel, yearLevel });

  if (target.action === 'GRADUATE') {
    return { nextYearLevel: null, isGraduating: true };
  }

  if (target.action === 'PROMOTE') {
    return {
      nextYearLevel: target.yearLevel,
      isGraduating: false,
    };
  }

  return { nextYearLevel: null, isGraduating: false };
}

/**
 * Gets the configured active academic year.
 */
export async function getActiveAcademicYear() {
  return prisma.academicYear.findFirst({
    where: {
      isActive: true,
    },
  });
}

function toJsonSafe(details: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(details));
}

async function createAudit(
  tx: Prisma.TransactionClient,
  userId: number | null,
  action: string,
  resourceType: string,
  resourceId: number | undefined,
  details: Record<string, unknown>
) {
  await tx.auditLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
      details: toJsonSafe(details),
    },
  });
}

function buildPromotionUpdate(target: Extract<PromotionTarget, { action: 'PROMOTE' }>) {
  const data: Record<string, unknown> = {
    gradeLevel: target.gradeLevel,
    yearLevel: target.yearLevel,
    graduationStatus: 'Active',
    graduatedAt: null,
    status: 'Active',
  };

  if (target.termType) {
    data.termType = target.termType;
  }

  if (target.program) {
    data.program = target.program;
  }

  return data;
}

async function processAcademicYearPromotion(
  academicYear: AcademicYearPromotionRecord,
  options: { userId?: number; now: Date; source: 'MANUAL' | 'CRON' }
): Promise<AcademicYearPromotionResult> {
  return prisma.$transaction(async (tx) => {
    const claim = await tx.academicYear.updateMany({
      where: {
        id: academicYear.id,
        promotionProcessedAt: null,
      },
      data: {
        promotionProcessedAt: options.now,
      },
    });

    if (claim.count === 0) {
      return {
        success: true,
        academicYearId: academicYear.id,
        academicYear: academicYear.year,
        skippedAcademicYear: true,
        promotedCount: 0,
        graduatedCount: 0,
        skippedCount: 1,
        errorCount: 0,
      };
    }

    const students = await tx.student.findMany({
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
      },
    });

    let promotedCount = 0;
    let graduatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ studentId?: number; error: string }> = [];

    for (const student of students) {
      try {
        const target = resolvePromotionTarget(student);

        if (target.action === 'SKIP') {
          skippedCount++;
          await createAudit(
            tx,
            options.userId || null,
            'AUTO_PROMOTE_STUDENT_SKIPPED',
            'STUDENT',
            student.id,
            {
              studentName: `${student.firstName} ${student.lastName}`,
              gradeLevel: student.gradeLevel,
              yearLevel: student.yearLevel,
              academicYear: academicYear.year,
              reason: target.reason,
              source: options.source,
            }
          );
          continue;
        }

        if (target.action === 'GRADUATE') {
          await tx.student.update({
            where: { id: student.id },
            data: {
              graduationStatus: 'Graduated',
              graduatedAt: options.now,
              status: 'Graduated',
            },
          });

          await tx.studentScholarship.deleteMany({
            where: {
              studentId: student.id,
              scholarshipStatus: 'Active',
            },
          });

          await tx.disbursement.deleteMany({
            where: {
              studentId: student.id,
              disbursementDate: { gte: options.now },
            },
          });

          await createAudit(
            tx,
            options.userId || null,
            'AUTO_GRADUATE_STUDENT',
            'STUDENT',
            student.id,
            {
              studentName: `${student.firstName} ${student.lastName}`,
              previousGradeLevel: student.gradeLevel,
              previousYearLevel: student.yearLevel,
              academicYear: academicYear.year,
              reason: 'Automatic graduation based on academic year promotion',
              source: options.source,
            }
          );

          graduatedCount++;
          continue;
        }

        await tx.student.update({
          where: { id: student.id },
          data: buildPromotionUpdate(target),
        });

        await createAudit(
          tx,
          options.userId || null,
          'AUTO_PROMOTE_STUDENT',
          'STUDENT',
          student.id,
          {
            studentName: `${student.firstName} ${student.lastName}`,
            previousGradeLevel: student.gradeLevel,
            previousYearLevel: student.yearLevel,
            previousProgram: student.program,
            previousTermType: student.termType,
            newGradeLevel: target.gradeLevel,
            newYearLevel: target.yearLevel,
            newProgram: target.program || student.program,
            newTermType: target.termType || student.termType,
            academicYear: academicYear.year,
            reason: 'Automatic promotion based on academic year promotion date',
            source: options.source,
          }
        );

        promotedCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          studentId: student.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await createAudit(tx, options.userId || null, 'AUTO_PROMOTE_STUDENTS', 'SYSTEM', undefined, {
      academicYear: academicYear.year,
      academicYearId: academicYear.id,
      semester: academicYear.semester,
      promotedCount,
      graduatedCount,
      skippedCount,
      errorCount,
      source: options.source,
      errors: errors.length > 0 ? errors : undefined,
    });

    return {
      success: true,
      academicYearId: academicYear.id,
      academicYear: academicYear.year,
      skippedAcademicYear: false,
      promotedCount,
      graduatedCount,
      skippedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  });
}

function getDatePartsInManila(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error('Failed to calculate Asia/Manila promotion date');
  }

  return { year, month, day };
}

export function getPromotionDueCutoff(now = new Date()) {
  const { year, month, day } = getDatePartsInManila(now);
  return new Date(`${year}-${month}-${day}T23:59:59.999Z`);
}

export async function runDueAcademicYearPromotions(
  options: { now?: Date } = {}
): Promise<DuePromotionRunResult> {
  const now = options.now || new Date();
  const dueCutoff = getPromotionDueCutoff(now);

  const academicYears = await prisma.academicYear.findMany({
    where: {
      promotionDate: {
        lte: dueCutoff,
      },
      promotionProcessedAt: null,
    },
    orderBy: {
      promotionDate: 'asc',
    },
  });

  const results: AcademicYearPromotionResult[] = [];
  for (const academicYear of academicYears) {
    const result = await processAcademicYearPromotion(academicYear, {
      now,
      source: 'CRON',
    });
    results.push(result);
  }

  return {
    success: true,
    processedAcademicYears: results.filter((result) => !result.skippedAcademicYear).length,
    promotedCount: results.reduce((total, result) => total + result.promotedCount, 0),
    graduatedCount: results.reduce((total, result) => total + result.graduatedCount, 0),
    skippedCount: results.reduce((total, result) => total + result.skippedCount, 0),
    errorCount: results.reduce((total, result) => total + result.errorCount, 0),
    errors: results.flatMap((result) => result.errors || []),
    results,
  };
}

/**
 * Manually runs promotion for the configured active academic year.
 */
export async function autoPromoteStudents(userId?: number): Promise<PromotionRunResult> {
  const activeAcademicYear = await getActiveAcademicYear();

  if (!activeAcademicYear) {
    return {
      success: false,
      error: 'No active academic year found. Please configure an active academic year first.',
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    };
  }

  const result = await processAcademicYearPromotion(activeAcademicYear, {
    userId,
    now: new Date(),
    source: 'MANUAL',
  });

  return {
    success: true,
    promotedCount: result.promotedCount,
    graduatedCount: result.graduatedCount,
    skippedCount: result.skippedCount,
    errorCount: result.errorCount,
    errors: result.errors,
  };
}

/**
 * Manually promotes a single student using the same cross-level promotion rules.
 * @param studentId The ID of the student to promote
 * @param userId The ID of the user triggering the promotion (for audit logging)
 * @returns Updated student record
 */
export async function promoteStudent(studentId: number, userId?: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  if (student.graduationStatus === 'Graduated') {
    throw new Error('Cannot promote a graduated student');
  }

  const target = resolvePromotionTarget(student);

  if (target.action === 'SKIP') {
    throw new Error(target.reason);
  }

  if (target.action === 'GRADUATE') {
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        graduationStatus: 'Graduated',
        graduatedAt: new Date(),
        status: 'Graduated',
      },
    });

    await prisma.studentScholarship.deleteMany({
      where: {
        studentId: student.id,
        scholarshipStatus: 'Active',
      },
    });

    await prisma.disbursement.deleteMany({
      where: {
        studentId: student.id,
        disbursementDate: { gte: new Date() },
      },
    });

    await logAudit(userId || null, 'MANUAL_GRADUATE_STUDENT', 'STUDENT', student.id, {
      studentName: `${student.firstName} ${student.lastName}`,
      reason: 'Manual promotion reached graduation',
    });

    return updated;
  }

  const updated = await prisma.student.update({
    where: { id: studentId },
    data: buildPromotionUpdate(target),
  });

  await logAudit(userId || null, 'MANUAL_PROMOTE_STUDENT', 'STUDENT', student.id, {
    studentName: `${student.firstName} ${student.lastName}`,
    previousGradeLevel: student.gradeLevel,
    previousYearLevel: student.yearLevel,
    newGradeLevel: target.gradeLevel,
    newYearLevel: target.yearLevel,
    reason: 'Manual promotion',
  });

  return updated;
}
