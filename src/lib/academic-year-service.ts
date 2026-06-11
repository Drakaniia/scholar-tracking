import type { Prisma } from '@prisma/client';

import type { GradeLevel, StudentAcademicOutcome, StudentTransitionDecision, TermType } from '@/types';

import { logAudit } from './auth';
import prisma from './prisma';
import {
  getPromotionDecisionRequirementReason,
  isPromotionDecisionAllowed,
  isStudentTransitionDecision,
} from './promotion-decisions';
import { getPromotionStateBlocker, getPromotionTargetBlocker } from './promotion-validation';

export const UNDECLARED_COLLEGE_PROGRAM = 'Undeclared College Program';

export interface PromotionStudentInput {
  gradeLevel: string;
  yearLevel: string;
  program?: string;
  termType?: string;
  transitionDecision?: string | null;
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
      action: 'RETAIN';
      reason: string;
    }
  | {
      action: 'SEPARATE';
      status: string;
      graduationStatus: string;
      outcome: StudentAcademicOutcome;
      reason: string;
    }
  | {
      action: 'SKIP';
      reason: string;
    };

interface AcademicYearPromotionRecord {
  id: number;
  year: string;
  semester: string;
  startDate: Date;
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

interface PromotionUndoResult {
  success: boolean;
  error?: string;
  academicYearId?: number;
  academicYear?: string;
  restoredCount: number;
  restoredScholarshipCount: number;
  restoredDisbursementCount: number;
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

export interface SelectedPromotionStudentResult {
  studentId: number;
  studentName: string;
  fromLevel: string;
  toLevel: string | null;
  action: PromotionTarget['action'] | 'ARCHIVE';
  success: boolean;
  error?: string;
}

export interface SelectedPromotionRunResult extends PromotionRunResult {
  cohortCount: number;
  selectedCount: number;
  archivedCount: number;
  results: SelectedPromotionStudentResult[];
}

type SelectedPromotionDecisionMap = ReadonlyMap<number, StudentTransitionDecision>;

const SELECTED_PROMOTION_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 60_000,
} as const;

type SeparatingPromotionDecision = Extract<
  StudentTransitionDecision,
  'COMPLETED_JHS' | 'GRADUATED_SHS' | 'TRANSFERRED_OUT' | 'WITHDRAWN'
>;

function normalizeTransitionDecision(decision?: string | null): StudentTransitionDecision | null {
  return isStudentTransitionDecision(decision) ? decision : null;
}

function buildSeparateTarget(
  decision: SeparatingPromotionDecision
): Extract<PromotionTarget, { action: 'SEPARATE' }> {
  if (decision === 'COMPLETED_JHS') {
    return {
      action: 'SEPARATE',
      status: 'Completed JHS',
      graduationStatus: 'Completed JHS',
      outcome: 'COMPLETED_JHS',
      reason: 'Student completed Junior High and is not continuing to Senior High in this school',
    };
  }

  if (decision === 'GRADUATED_SHS') {
    return {
      action: 'SEPARATE',
      status: 'Graduated SHS',
      graduationStatus: 'Graduated SHS',
      outcome: 'GRADUATED_SHS',
      reason: 'Student graduated Senior High and is not continuing to College in this school',
    };
  }

  if (decision === 'TRANSFERRED_OUT') {
    return {
      action: 'SEPARATE',
      status: 'Transferred Out',
      graduationStatus: 'Transferred Out',
      outcome: 'TRANSFERRED_OUT',
      reason: 'Student transferred out after the school year',
    };
  }

  return {
    action: 'SEPARATE',
    status: 'Withdrawn',
    graduationStatus: 'Withdrawn',
    outcome: 'WITHDRAWN',
    reason: 'Student withdrew after the school year',
  };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled transition decision: ${JSON.stringify(value)}`);
}

function resolveDecisionTarget(
  decision: StudentTransitionDecision,
  yearLevel: string
): PromotionTarget | null {
  switch (decision) {
    case 'CONTINUE_NEXT_LEVEL':
    case 'CONTINUE_SENIOR_HIGH':
    case 'CONTINUE_COLLEGE':
      return null;
    case 'RETAINED':
      return {
        action: 'RETAIN',
        reason: `Student retained in ${yearLevel}`,
      };
    case 'COMPLETED_JHS':
    case 'GRADUATED_SHS':
    case 'TRANSFERRED_OUT':
    case 'WITHDRAWN':
      return buildSeparateTarget(decision);
    case 'GRADUATED_COLLEGE':
      return { action: 'GRADUATE' };
    default:
      return assertNever(decision);
  }
}

function getDecisionGateTarget(
  student: PromotionStudentInput,
  decision: StudentTransitionDecision | null
): PromotionTarget | null {
  if (!decision || !isPromotionDecisionAllowed(student, decision)) {
    return {
      action: 'SKIP',
      reason: getPromotionDecisionRequirementReason(student),
    };
  }

  return resolveDecisionTarget(decision, student.yearLevel);
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
  const transitionDecision = normalizeTransitionDecision(student.transitionDecision);

  if (currentGrade !== null) {
    if (currentGrade < 1 || currentGrade > 12) {
      return {
        action: 'SKIP',
        reason: `Unsupported year level: ${student.yearLevel}`,
      };
    }

    const decisionTarget = getDecisionGateTarget(student, transitionDecision);
    if (decisionTarget) return decisionTarget;

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

    const decisionTarget = getDecisionGateTarget(student, transitionDecision);
    if (decisionTarget) return decisionTarget;

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
  const currentGrade = parseGradeNumber(yearLevel);

  if (currentGrade !== null) {
    if (currentGrade >= 1 && currentGrade <= 9) {
      return { nextYearLevel: `Grade ${currentGrade + 1}`, isGraduating: false };
    }

    if (currentGrade === 10) {
      return { nextYearLevel: 'Grade 11', isGraduating: false };
    }

    if (currentGrade === 11) {
      return { nextYearLevel: 'Grade 12', isGraduating: false };
    }

    if (currentGrade === 12) {
      return { nextYearLevel: '1st Year', isGraduating: false };
    }
  }

  if (gradeLevel === 'COLLEGE') {
    const collegeYear = parseCollegeYearNumber(yearLevel);

    if (collegeYear === null) {
      return { nextYearLevel: null, isGraduating: false };
    }

    if (collegeYear >= 3) {
      return { nextYearLevel: null, isGraduating: true };
    }

    return { nextYearLevel: ordinalCollegeYear(collegeYear + 1), isGraduating: false };
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

function getPromotionBackupContext(academicYearId: number) {
  return `ACADEMIC_YEAR_PROMOTION:${academicYearId}`;
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
    transitionDecision: null,
    transitionDecisionAt: null,
    transitionDecisionBy: null,
    separatedAt: null,
    separationReason: null,
  };

  if (target.termType) {
    data.termType = target.termType;
  }

  if (target.program) {
    data.program = target.program;
  }

  return data;
}

async function backupStudentBeforePromotion(
  tx: Prisma.TransactionClient,
  params: {
    academicYearId: number;
    userId?: number;
    operation: 'AUTO_PROMOTE_STUDENT' | 'AUTO_GRADUATE_STUDENT';
    student: {
      id: number;
      gradeLevel: string;
      yearLevel: string;
      program: string;
      termType: string;
      status: string;
      graduationStatus: string | null;
      graduatedAt: Date | null;
      isArchived: boolean;
      transitionDecision: string | null;
      transitionDecisionAt: Date | null;
      transitionDecisionBy: number | null;
      separatedAt: Date | null;
      separationReason: string | null;
    };
    scholarships?: Array<Record<string, unknown>>;
    disbursements?: Array<Record<string, unknown>>;
  }
) {
  await tx.backup.create({
    data: {
      tableName: 'students',
      recordId: params.student.id,
      operation: params.operation,
      operationContext: getPromotionBackupContext(params.academicYearId),
      performedBy: params.userId || null,
      oldValue: toJsonSafe({
        student: params.student,
        scholarships: params.scholarships || [],
        disbursements: params.disbursements || [],
      }),
    },
  });
}

function getPromotionOutcome(target: PromotionTarget): StudentAcademicOutcome {
  if (target.action === 'PROMOTE') return 'PROMOTED';
  if (target.action === 'RETAIN') return 'RETAINED';
  if (target.action === 'GRADUATE') return 'GRADUATED_COLLEGE';
  if (target.action === 'SEPARATE') return target.outcome;
  return 'SKIPPED';
}

async function createAcademicRecordForTransition(
  tx: Prisma.TransactionClient,
  params: {
    academicYear: AcademicYearPromotionRecord;
    student: {
      id: number;
      gradeLevel: string;
      yearLevel: string;
      program: string;
      termType: string;
      status: string;
      transitionDecision: string | null;
    };
    target: PromotionTarget;
    now: Date;
  }
) {
  await tx.studentAcademicRecord.create({
    data: {
      studentId: params.student.id,
      academicYearId: params.academicYear.id,
      academicYear: params.academicYear.year,
      gradeLevel: params.student.gradeLevel,
      yearLevel: params.student.yearLevel,
      program: params.student.program,
      termType: params.student.termType,
      status: params.student.status,
      outcome: getPromotionOutcome(params.target),
      decision: params.student.transitionDecision,
      nextGradeLevel: params.target.action === 'PROMOTE' ? params.target.gradeLevel : null,
      nextYearLevel: params.target.action === 'PROMOTE' ? params.target.yearLevel : null,
      nextProgram:
        params.target.action === 'PROMOTE' ? params.target.program || params.student.program : null,
      nextTermType:
        params.target.action === 'PROMOTE'
          ? params.target.termType || params.student.termType
          : null,
      isCurrent: false,
      startedAt: params.academicYear.startDate,
      endedAt: params.now,
    },
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

function normalizeStudentRestoreData(student: Record<string, unknown>) {
  return {
    gradeLevel: String(student.gradeLevel),
    yearLevel: String(student.yearLevel),
    program: String(student.program),
    termType: String(student.termType),
    status: String(student.status),
    graduationStatus: student.graduationStatus ? String(student.graduationStatus) : null,
    graduatedAt: student.graduatedAt ? new Date(String(student.graduatedAt)) : null,
    isArchived: Boolean(student.isArchived),
    transitionDecision: student.transitionDecision ? String(student.transitionDecision) : null,
    transitionDecisionAt: student.transitionDecisionAt
      ? new Date(String(student.transitionDecisionAt))
      : null,
    transitionDecisionBy:
      student.transitionDecisionBy === null || student.transitionDecisionBy === undefined
        ? null
        : Number(student.transitionDecisionBy),
    separatedAt: student.separatedAt ? new Date(String(student.separatedAt)) : null,
    separationReason: student.separationReason ? String(student.separationReason) : null,
  };
}

function requiredDate(value: unknown) {
  return new Date(String(value));
}

function optionalDate(value: unknown) {
  return value ? new Date(String(value)) : undefined;
}

function restoreScholarshipData(
  scholarship: Record<string, unknown>
): Prisma.StudentScholarshipCreateManyInput {
  return {
    studentId: Number(scholarship.studentId),
    scholarshipId: Number(scholarship.scholarshipId),
    awardDate: requiredDate(scholarship.awardDate),
    startTerm: String(scholarship.startTerm),
    endTerm: String(scholarship.endTerm),
    grantAmount: String(scholarship.grantAmount),
    scholarshipStatus: String(scholarship.scholarshipStatus),
    grantType: String(scholarship.grantType || 'FULL'),
    createdAt: optionalDate(scholarship.createdAt),
    updatedAt: optionalDate(scholarship.updatedAt),
  };
}

function restoreDisbursementData(
  disbursement: Record<string, unknown>
): Prisma.DisbursementCreateManyInput {
  return {
    disbursementDate: requiredDate(disbursement.disbursementDate),
    amount: String(disbursement.amount),
    term: String(disbursement.term),
    method: String(disbursement.method),
    remarks: disbursement.remarks ? String(disbursement.remarks) : null,
    scholarshipId: Number(disbursement.scholarshipId),
    studentId: Number(disbursement.studentId),
    academicYearId:
      disbursement.academicYearId === null || disbursement.academicYearId === undefined
        ? null
        : Number(disbursement.academicYearId),
    createdAt: optionalDate(disbursement.createdAt),
    updatedAt: optionalDate(disbursement.updatedAt),
  };
}

export async function undoLastAcademicYearPromotion(userId?: number): Promise<PromotionUndoResult> {
  const activeAcademicYear = await prisma.academicYear.findFirst({
    where: {
      isActive: true,
      promotionProcessedAt: { not: null },
    },
    orderBy: {
      promotionProcessedAt: 'desc',
    },
  });

  if (!activeAcademicYear) {
    return {
      success: false,
      error: 'No processed active academic year promotion found to undo.',
      restoredCount: 0,
      restoredScholarshipCount: 0,
      restoredDisbursementCount: 0,
    };
  }

  return prisma.$transaction(async (tx) => {
    const operationContext = getPromotionBackupContext(activeAcademicYear.id);
    const backups = await tx.backup.findMany({
      where: { operationContext },
      orderBy: { id: 'asc' },
    });

    if (backups.length === 0) {
      return {
        success: false,
        error: 'No promotion backup records found for the active academic year.',
        academicYearId: activeAcademicYear.id,
        academicYear: activeAcademicYear.year,
        restoredCount: 0,
        restoredScholarshipCount: 0,
        restoredDisbursementCount: 0,
      };
    }

    let restoredScholarshipCount = 0;
    let restoredDisbursementCount = 0;

    for (const backup of backups) {
      const oldValue = backup.oldValue as Record<string, unknown>;
      const student = oldValue.student as Record<string, unknown>;
      const scholarships =
        (oldValue.scholarships as Array<Record<string, unknown>> | undefined) || [];
      const disbursements =
        (oldValue.disbursements as Array<Record<string, unknown>> | undefined) || [];

      await tx.student.update({
        where: { id: Number(student.id || backup.recordId) },
        data: normalizeStudentRestoreData(student),
      });

      if (scholarships.length > 0) {
        await tx.studentScholarship.createMany({
          data: scholarships.map((scholarship) => restoreScholarshipData(scholarship)),
          skipDuplicates: true,
        });
        restoredScholarshipCount += scholarships.length;
      }

      if (disbursements.length > 0) {
        await tx.disbursement.createMany({
          data: disbursements.map((disbursement) => restoreDisbursementData(disbursement)),
          skipDuplicates: true,
        });
        restoredDisbursementCount += disbursements.length;
      }
    }

    await tx.academicYear.update({
      where: { id: activeAcademicYear.id },
      data: { promotionProcessedAt: null },
    });

    await tx.studentAcademicRecord.deleteMany({
      where: { academicYearId: activeAcademicYear.id },
    });

    await tx.backup.deleteMany({
      where: { operationContext },
    });

    await createAudit(tx, userId || null, 'UNDO_AUTO_PROMOTE_STUDENTS', 'SYSTEM', undefined, {
      academicYear: activeAcademicYear.year,
      academicYearId: activeAcademicYear.id,
      restoredCount: backups.length,
      restoredScholarshipCount,
      restoredDisbursementCount,
    });

    return {
      success: true,
      academicYearId: activeAcademicYear.id,
      academicYear: activeAcademicYear.year,
      restoredCount: backups.length,
      restoredScholarshipCount,
      restoredDisbursementCount,
    };
  });
}

export function getPromotionDueCutoff(now = new Date()) {
  const { year, month, day } = getDatePartsInManila(now);
  return new Date(`${year}-${month}-${day}T23:59:59.999Z`);
}

export async function runDueAcademicYearPromotions(): Promise<DuePromotionRunResult> {
  return {
    success: false,
    processedAcademicYears: 0,
    promotedCount: 0,
    graduatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [
      {
        error:
          'Scheduled all-student promotion is disabled. Use Registry bulk promotion to select continuing Bosco/FSE students and archive non-continuing students.',
      },
    ],
    results: [],
  };
}

/**
 * Manually runs promotion for the configured active academic year, or a specific academic year.
 */
export async function autoPromoteStudents(): Promise<PromotionRunResult> {
  return {
    success: false,
    error:
      'All-student promotion is disabled. Use Registry bulk promotion to select continuing Bosco/FSE students and archive non-continuing students.',
    promotedCount: 0,
    graduatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
  };
}

function getPromotionTargetToLevel(
  student: { gradeLevel: string; yearLevel: string },
  target: PromotionTarget
) {
  if (target.action === 'PROMOTE') return `${target.gradeLevel} - ${target.yearLevel}`;
  if (target.action === 'GRADUATE') return 'Graduated';
  if (target.action === 'SEPARATE') return target.status;
  if (target.action === 'RETAIN') return `${student.gradeLevel} - ${student.yearLevel}`;
  return null;
}

/**
 * Manually promotes only the selected students and records their transition results.
 * This does not claim the whole academic year promotion run.
 */
export async function promoteSelectedStudents(
  studentIds: number[],
  userId?: number,
  academicYearId?: number,
  cohortStudentIds?: number[],
  transitionDecisions?: SelectedPromotionDecisionMap
): Promise<SelectedPromotionRunResult> {
  const selectedIds = [...new Set(studentIds.filter((id) => Number.isInteger(id)))];
  const cohortIds = [
    ...new Set((cohortStudentIds || selectedIds).filter((id) => Number.isInteger(id))),
  ];
  const selectedIdSet = new Set(selectedIds);
  const archiveIds = cohortIds.filter((studentId) => !selectedIdSet.has(studentId));
  const cohortIdSet = new Set(cohortIds);

  if (cohortIds.length === 0) {
    return {
      success: false,
      error: 'No students are available in the promotion list.',
      cohortCount: 0,
      selectedCount: 0,
      archivedCount: 0,
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      results: [],
    };
  }

  if (selectedIds.some((studentId) => !cohortIdSet.has(studentId))) {
    return {
      success: false,
      error: 'Selected students must belong to the current promotion list.',
      cohortCount: cohortIds.length,
      selectedCount: selectedIds.length,
      archivedCount: 0,
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: selectedIds.length,
      results: selectedIds.map((studentId) => ({
        studentId,
        studentName: `Student #${studentId}`,
        fromLevel: '-',
        toLevel: null,
        action: 'SKIP',
        success: false,
        error: 'Selected student is outside the current promotion list.',
      })),
    };
  }

  const activeAcademicYear = academicYearId
    ? await prisma.academicYear.findUnique({ where: { id: academicYearId } })
    : await getActiveAcademicYear();

  if (!activeAcademicYear) {
    return {
      success: false,
      error: academicYearId
        ? 'Academic year not found. Please refresh the registry and try again.'
        : 'No active academic year found. Please configure an active academic year first.',
      cohortCount: cohortIds.length,
      selectedCount: selectedIds.length,
      archivedCount: 0,
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: cohortIds.length,
      results: cohortIds.map((studentId) => ({
        studentId,
        studentName: `Student #${studentId}`,
        fromLevel: '-',
        toLevel: null,
        action: 'SKIP',
        success: false,
        error: 'No active academic year found.',
      })),
    };
  }

  if (activeAcademicYear.promotionProcessedAt) {
    return {
      success: false,
      error:
        'This academic year has already been promoted. Undo the last promotion before running selected promotions again.',
      cohortCount: cohortIds.length,
      selectedCount: selectedIds.length,
      archivedCount: 0,
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: cohortIds.length,
      errorCount: cohortIds.length,
      results: cohortIds.map((studentId) => ({
        studentId,
        studentName: `Student #${studentId}`,
        fromLevel: '-',
        toLevel: null,
        action: 'SKIP',
        success: false,
        error: 'Academic year promotion has already been processed.',
      })),
    };
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const students = await tx.student.findMany({
      where: {
        id: { in: [...new Set([...cohortIds, ...selectedIds])] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        yearLevel: true,
        program: true,
        termType: true,
        status: true,
        graduationStatus: true,
        graduatedAt: true,
        isArchived: true,
        transitionDecision: true,
        transitionDecisionAt: true,
        transitionDecisionBy: true,
        separatedAt: true,
        separationReason: true,
      },
    });
    const studentsById = new Map(students.map((student) => [student.id, student]));

    let promotedCount = 0;
    const graduatedCount = 0;
    let archivedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ studentId?: number; error: string }> = [];
    const results: SelectedPromotionStudentResult[] = [];

    for (const studentId of selectedIds) {
      const student = studentsById.get(studentId);
      const studentName = student
        ? `${student.firstName} ${student.lastName}`
        : `Student #${studentId}`;
      const fromLevel = student ? `${student.gradeLevel} - ${student.yearLevel}` : '-';

      if (!student) {
        const error = 'Student was not found.';
        skippedCount++;
        errorCount++;
        errors.push({ studentId, error });
        results.push({
          studentId,
          studentName,
          fromLevel,
          toLevel: null,
          action: 'SKIP',
          success: false,
          error,
        });
        continue;
      }

      const stateBlocker = getPromotionStateBlocker(student, 'promote');
      if (stateBlocker) {
        const error = stateBlocker;
        skippedCount++;
        errorCount++;
        errors.push({ studentId, error });
        results.push({
          studentId,
          studentName,
          fromLevel,
          toLevel: null,
          action: 'SKIP',
          success: false,
          error,
        });
        continue;
      }

      const studentForPromotion = {
        ...student,
        transitionDecision: transitionDecisions?.get(student.id) || student.transitionDecision,
      };
      const target = resolvePromotionTarget(studentForPromotion);
      const toLevel = getPromotionTargetToLevel(studentForPromotion, target);

      const targetBlocker = getPromotionTargetBlocker(target);
      if (target.action !== 'PROMOTE') {
        const error = targetBlocker || 'Student cannot be promoted to the next academic level.';
        skippedCount++;
        errorCount++;
        errors.push({ studentId, error });
        results.push({
          studentId,
          studentName,
          fromLevel,
          toLevel,
          action: target.action,
          success: false,
          error,
        });
        continue;
      }

      await backupStudentBeforePromotion(tx, {
        academicYearId: activeAcademicYear.id,
        userId,
        operation: 'AUTO_PROMOTE_STUDENT',
        student,
      });

      await createAcademicRecordForTransition(tx, {
        academicYear: activeAcademicYear,
        student: studentForPromotion,
        target,
        now,
      });

      await tx.student.update({
        where: { id: student.id },
        data: buildPromotionUpdate(target),
      });

      await createAudit(
        tx,
        userId || null,
        'MANUAL_SELECTED_PROMOTE_STUDENT',
        'STUDENT',
        student.id,
        {
          studentName,
          previousGradeLevel: student.gradeLevel,
          previousYearLevel: student.yearLevel,
          previousProgram: student.program,
          previousTermType: student.termType,
          newGradeLevel: target.gradeLevel,
          newYearLevel: target.yearLevel,
          newProgram: target.program || student.program,
          newTermType: target.termType || student.termType,
          academicYear: activeAcademicYear.year,
          reason: 'Selected continuing student for Bosco/FSE promotion',
          source: 'MANUAL_SELECTED',
        }
      );

      promotedCount++;
      results.push({
        studentId,
        studentName,
        fromLevel,
        toLevel,
        action: target.action,
        success: true,
      });
    }

    for (const studentId of archiveIds) {
      const student = studentsById.get(studentId);
      const studentName = student
        ? `${student.firstName} ${student.lastName}`
        : `Student #${studentId}`;
      const fromLevel = student ? `${student.gradeLevel} - ${student.yearLevel}` : '-';

      if (!student) {
        const error = 'Student was not found.';
        skippedCount++;
        errorCount++;
        errors.push({ studentId, error });
        results.push({
          studentId,
          studentName,
          fromLevel,
          toLevel: null,
          action: 'ARCHIVE',
          success: false,
          error,
        });
        continue;
      }

      const stateBlocker = getPromotionStateBlocker(student, 'archive');
      if (stateBlocker) {
        const error = stateBlocker;
        skippedCount++;
        errorCount++;
        errors.push({ studentId, error });
        results.push({
          studentId,
          studentName,
          fromLevel,
          toLevel: null,
          action: 'ARCHIVE',
          success: false,
          error,
        });
        continue;
      }

      const archiveReason = 'Not selected to continue at Bosco/FSE for the next academic level';

      await backupStudentBeforePromotion(tx, {
        academicYearId: activeAcademicYear.id,
        userId,
        operation: 'AUTO_PROMOTE_STUDENT',
        student,
      });

      await createAcademicRecordForTransition(tx, {
        academicYear: activeAcademicYear,
        student,
        target: {
          action: 'SKIP',
          reason: archiveReason,
        },
        now,
      });

      await tx.student.update({
        where: { id: student.id },
        data: {
          isArchived: true,
          separatedAt: now,
          separationReason: archiveReason,
        },
      });

      await createAudit(
        tx,
        userId || null,
        'MANUAL_SELECTED_ARCHIVE_NON_CONTINUING_STUDENT',
        'STUDENT',
        student.id,
        {
          studentName,
          gradeLevel: student.gradeLevel,
          yearLevel: student.yearLevel,
          academicYear: activeAcademicYear.year,
          reason: archiveReason,
          source: 'MANUAL_SELECTED',
        }
      );

      archivedCount++;
      results.push({
        studentId,
        studentName,
        fromLevel,
        toLevel: 'Archived',
        action: 'ARCHIVE',
        success: true,
      });
    }

    await createAudit(tx, userId || null, 'MANUAL_SELECTED_PROMOTE_STUDENTS', 'SYSTEM', undefined, {
      academicYear: activeAcademicYear.year,
      academicYearId: activeAcademicYear.id,
      cohortCount: cohortIds.length,
      selectedCount: selectedIds.length,
      promotedCount,
      graduatedCount,
      archivedCount,
      skippedCount,
      errorCount,
      source: 'MANUAL_SELECTED',
      errors: errors.length > 0 ? errors : undefined,
    });

    return {
      success: promotedCount + graduatedCount + archivedCount > 0,
      error:
        promotedCount + graduatedCount + archivedCount === 0
          ? 'No selected students were processed.'
          : undefined,
      cohortCount: cohortIds.length,
      selectedCount: selectedIds.length,
      archivedCount,
      promotedCount,
      graduatedCount,
      skippedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      results,
    };
  }, SELECTED_PROMOTION_TRANSACTION_OPTIONS);
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

  if (target.action === 'RETAIN') {
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        graduationStatus: 'Active',
        graduatedAt: null,
        status: 'Active',
        transitionDecision: null,
        transitionDecisionAt: null,
        transitionDecisionBy: null,
        separatedAt: null,
        separationReason: null,
      },
    });

    await logAudit(userId || null, 'MANUAL_RETAIN_STUDENT', 'STUDENT', student.id, {
      studentName: `${student.firstName} ${student.lastName}`,
      gradeLevel: student.gradeLevel,
      yearLevel: student.yearLevel,
      reason: target.reason,
    });

    return updated;
  }

  if (target.action === 'SEPARATE') {
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        graduationStatus: target.graduationStatus,
        graduatedAt:
          target.outcome === 'COMPLETED_JHS' || target.outcome === 'GRADUATED_SHS'
            ? new Date()
            : null,
        status: target.status,
        separatedAt: new Date(),
        separationReason: target.reason,
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

    await logAudit(userId || null, 'MANUAL_SEPARATE_STUDENT', 'STUDENT', student.id, {
      studentName: `${student.firstName} ${student.lastName}`,
      previousGradeLevel: student.gradeLevel,
      previousYearLevel: student.yearLevel,
      outcome: target.outcome,
      reason: target.reason,
    });

    return updated;
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
