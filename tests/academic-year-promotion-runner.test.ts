import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { StudentTransitionDecision } from '@/types';

const prismaMock = vi.hoisted(() => ({
  academicYear: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  academicYear: {
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  backup: {
    create: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  disbursement: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  studentScholarship: {
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  studentAcademicRecord: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

describe('runDueAcademicYearPromotions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects scheduled all-student promotion without querying or updating students', async () => {
    const { runDueAcademicYearPromotions } = await import('@/lib/academic-year-service');

    const result = await runDueAcademicYearPromotions();

    expect(result).toMatchObject({
      success: false,
      processedAcademicYears: 0,
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    });
    expect(result.errors?.[0]?.error).toContain('Scheduled all-student promotion is disabled');
    expect(prismaMock.academicYear.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(txMock.student.findMany).not.toHaveBeenCalled();
    expect(txMock.student.update).not.toHaveBeenCalled();
  });

  it('rejects legacy manual all-student promotion helper without database writes', async () => {
    const { autoPromoteStudents } = await import('@/lib/academic-year-service');

    const result = await autoPromoteStudents();

    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining('All-student promotion is disabled'),
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    });
    expect(prismaMock.academicYear.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(txMock.student.update).not.toHaveBeenCalled();
  });
});

describe('promoteSelectedStudents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(txMock));
    prismaMock.academicYear.findFirst.mockResolvedValue({
      id: 1,
      year: '2026-2027',
      semester: '1ST',
      startDate: new Date('2025-06-01T00:00:00.000Z'),
      promotionDate: new Date('2026-05-22T00:00:00.000Z'),
      promotionProcessedAt: null,
    });
    txMock.auditLog.create.mockResolvedValue({});
    txMock.backup.create.mockResolvedValue({});
    txMock.disbursement.deleteMany.mockResolvedValue({ count: 0 });
    txMock.disbursement.findMany.mockResolvedValue([]);
    txMock.student.update.mockResolvedValue({});
    txMock.studentAcademicRecord.create.mockResolvedValue({});
    txMock.studentScholarship.deleteMany.mockResolvedValue({ count: 0 });
    txMock.studentScholarship.findMany.mockResolvedValue([]);
  });

  function activeStudent(overrides: Record<string, unknown>) {
    return {
      id: 1,
      firstName: 'Test',
      lastName: 'Student',
      gradeLevel: 'GRADE_SCHOOL',
      yearLevel: 'Grade 1',
      program: 'Grade School',
      termType: 'SEMESTER',
      status: 'Active',
      graduationStatus: 'Active',
      graduatedAt: null,
      isArchived: false,
      transitionDecision: null,
      transitionDecisionAt: null,
      transitionDecisionBy: null,
      separatedAt: null,
      separationReason: null,
      ...overrides,
    };
  }

  it('promotes only selected active students without claiming the whole academic year', async () => {
    txMock.student.findMany.mockResolvedValueOnce([
      activeStudent({
        id: 2,
        firstName: 'Grade',
        lastName: 'Six',
        gradeLevel: 'GRADE_SCHOOL',
        yearLevel: 'Grade 6',
        transitionDecision: 'CONTINUE_NEXT_LEVEL',
      }),
      activeStudent({
        id: 11,
        firstName: 'Grade',
        lastName: 'Eleven',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 11',
        program: 'STEM',
        transitionDecision: 'CONTINUE_NEXT_LEVEL',
      }),
      activeStudent({
        id: 12,
        firstName: 'Grade',
        lastName: 'Twelve',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        program: 'ABM',
        transitionDecision: 'CONTINUE_COLLEGE',
      }),
    ]);

    const { promoteSelectedStudents } = await import('@/lib/academic-year-service');
    const result = await promoteSelectedStudents([2, 11, 12], 23);

    expect(result).toMatchObject({
      success: true,
      selectedCount: 3,
      promotedCount: 3,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
    });
    expect(prismaMock.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        maxWait: 10_000,
        timeout: 60_000,
      })
    );
    expect(txMock.academicYear.updateMany).not.toHaveBeenCalled();
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: expect.objectContaining({ gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 7' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: expect.objectContaining({ gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 12' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: expect.objectContaining({
        gradeLevel: 'COLLEGE',
        yearLevel: '1st Year',
        program: 'Undeclared College Program',
        termType: 'TRIMESTER',
      }),
    });
    expect(txMock.studentAcademicRecord.create).toHaveBeenCalledTimes(3);
  });

  it('archives unselected cohort students instead of promoting them', async () => {
    txMock.student.findMany.mockResolvedValueOnce([
      activeStudent({
        id: 6,
        firstName: 'Marco',
        lastName: 'Villanueva',
        gradeLevel: 'GRADE_SCHOOL',
        yearLevel: 'Grade 6',
        transitionDecision: 'CONTINUE_NEXT_LEVEL',
      }),
      activeStudent({
        id: 12,
        firstName: 'Maria',
        lastName: 'Santos',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        program: 'ABM',
        transitionDecision: 'GRADUATED_SHS',
      }),
    ]);

    const { promoteSelectedStudents } = await import('@/lib/academic-year-service');
    const result = await promoteSelectedStudents([6], 23, undefined, [6, 12]);

    expect(result).toMatchObject({
      success: true,
      cohortCount: 2,
      selectedCount: 1,
      promotedCount: 1,
      archivedCount: 1,
      errorCount: 0,
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 6 },
      data: expect.objectContaining({ gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 7' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isArchived: true,
        separatedAt: expect.any(Date),
        separationReason: expect.stringContaining('Not selected to continue'),
      }),
      where: { id: 12 },
    });
    expect(txMock.studentAcademicRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: 12,
        outcome: 'SKIPPED',
      }),
    });
  });

  it('archives the entire cohort when no students are selected to continue', async () => {
    txMock.student.findMany.mockResolvedValueOnce([
      activeStudent({
        id: 6,
        firstName: 'Marco',
        lastName: 'Villanueva',
        gradeLevel: 'GRADE_SCHOOL',
        yearLevel: 'Grade 6',
      }),
      activeStudent({
        id: 10,
        firstName: 'Ana',
        lastName: 'Reyes',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 10',
      }),
    ]);

    const { promoteSelectedStudents } = await import('@/lib/academic-year-service');
    const result = await promoteSelectedStudents([], 23, undefined, [6, 10]);

    expect(result).toMatchObject({
      success: true,
      cohortCount: 2,
      selectedCount: 0,
      promotedCount: 0,
      archivedCount: 2,
      errorCount: 0,
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 6 },
      data: expect.objectContaining({ isArchived: true }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: expect.objectContaining({ isArchived: true }),
    });
  });

  it('returns per-student errors when selected students still need decisions', async () => {
    txMock.student.findMany.mockResolvedValueOnce([
      activeStudent({
        id: 12,
        firstName: 'Maria',
        lastName: 'Santos',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        program: 'ABM',
      }),
    ]);

    const { promoteSelectedStudents } = await import('@/lib/academic-year-service');
    const result = await promoteSelectedStudents([12], 23);

    expect(result).toMatchObject({
      success: false,
      selectedCount: 1,
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: 1,
      errorCount: 1,
    });
    expect(result.errors?.[0]).toEqual(
      expect.objectContaining({
        studentId: 12,
        error: expect.stringContaining('Grade 12 requires an end-of-year decision'),
      })
    );
    expect(txMock.student.update).not.toHaveBeenCalled();
    expect(txMock.studentAcademicRecord.create).not.toHaveBeenCalled();
  });

  it('promotes selected undecided students when a continue decision is supplied with the selection', async () => {
    txMock.student.findMany.mockResolvedValueOnce([
      activeStudent({
        id: 7,
        firstName: 'Luis',
        lastName: 'Dela Cruz',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 7',
      }),
    ]);

    const { promoteSelectedStudents } = await import('@/lib/academic-year-service');
    const transitionDecisions = new Map<number, StudentTransitionDecision>([
      [7, 'CONTINUE_NEXT_LEVEL'],
    ]);
    const result = await promoteSelectedStudents([7], 23, undefined, [7], transitionDecisions);

    expect(result).toMatchObject({
      success: true,
      selectedCount: 1,
      promotedCount: 1,
      skippedCount: 0,
      errorCount: 0,
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 8' }),
    });
    expect(txMock.studentAcademicRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: 7,
        decision: 'CONTINUE_NEXT_LEVEL',
        outcome: 'PROMOTED',
      }),
    });
  });

  it('explains why an archived selected student cannot be promoted', async () => {
    txMock.student.findMany.mockResolvedValueOnce([
      activeStudent({
        id: 8,
        firstName: 'Archived',
        lastName: 'Student',
        isArchived: true,
      }),
    ]);

    const { promoteSelectedStudents } = await import('@/lib/academic-year-service');
    const result = await promoteSelectedStudents([8], 23);

    expect(result).toMatchObject({
      success: false,
      selectedCount: 1,
      promotedCount: 0,
      skippedCount: 1,
      errorCount: 1,
    });
    expect(result.results[0]).toMatchObject({
      studentId: 8,
      success: false,
      error: 'This student is archived and cannot be promoted.',
    });
    expect(txMock.student.update).not.toHaveBeenCalled();
  });

  it('explains when a selected Grade 12 student is marked as not continuing to college', async () => {
    txMock.student.findMany.mockResolvedValueOnce([
      activeStudent({
        id: 12,
        firstName: 'Maria',
        lastName: 'Santos',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        transitionDecision: 'GRADUATED_SHS',
      }),
    ]);

    const { promoteSelectedStudents } = await import('@/lib/academic-year-service');
    const result = await promoteSelectedStudents([12], 23);

    expect(result).toMatchObject({
      success: false,
      selectedCount: 1,
      promotedCount: 0,
      skippedCount: 1,
      errorCount: 1,
    });
    expect(result.results[0]).toMatchObject({
      studentId: 12,
      action: 'SEPARATE',
      success: false,
      error:
        'Student graduated Senior High and is not continuing to College in this school. Change the transition decision to continue if this student should be promoted.',
    });
    expect(txMock.student.update).not.toHaveBeenCalled();
  });
});

describe('undoLastAcademicYearPromotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) => callback(txMock));
    txMock.academicYear.update.mockResolvedValue({});
    txMock.backup.create.mockResolvedValue({});
    txMock.backup.deleteMany.mockResolvedValue({ count: 2 });
    txMock.disbursement.createMany.mockResolvedValue({ count: 1 });
    txMock.student.update.mockResolvedValue({});
    txMock.studentAcademicRecord.create.mockResolvedValue({});
    txMock.studentAcademicRecord.deleteMany.mockResolvedValue({ count: 0 });
    txMock.studentScholarship.createMany.mockResolvedValue({ count: 1 });
  });

  it('restores students and reopens the active academic year promotion marker', async () => {
    const promotionProcessedAt = new Date('2026-05-22T02:00:00.000Z');
    prismaMock.academicYear.findFirst.mockResolvedValueOnce({
      id: 1,
      year: '2026-2027',
      semester: '1ST',
      startDate: new Date('2025-06-01T00:00:00.000Z'),
      promotionDate: new Date('2026-05-22T00:00:00.000Z'),
      promotionProcessedAt,
    });
    txMock.backup.findMany.mockResolvedValueOnce([
      {
        id: 10,
        recordId: 1,
        oldValue: {
          student: {
            id: 1,
            gradeLevel: 'JUNIOR_HIGH',
            yearLevel: 'Grade 7',
            program: 'Junior High',
            termType: 'SEMESTER',
            status: 'Active',
            graduationStatus: 'Active',
            graduatedAt: null,
            isArchived: false,
          },
          scholarships: [],
          disbursements: [],
        },
      },
      {
        id: 11,
        recordId: 2,
        oldValue: {
          student: {
            id: 2,
            gradeLevel: 'COLLEGE',
            yearLevel: '3rd Year',
            program: 'BSIT',
            termType: 'TRIMESTER',
            status: 'Active',
            graduationStatus: 'Active',
            graduatedAt: null,
            isArchived: false,
          },
          scholarships: [
            {
              studentId: 2,
              scholarshipId: 5,
              awardDate: '2026-01-01T00:00:00.000Z',
              startTerm: '1ST',
              endTerm: '2ND',
              grantAmount: '1000',
              scholarshipStatus: 'Active',
              grantType: 'FULL',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          disbursements: [
            {
              disbursementDate: '2026-06-01T00:00:00.000Z',
              amount: '1000',
              term: '1ST',
              method: 'Cash',
              remarks: null,
              scholarshipId: 5,
              studentId: 2,
              academicYearId: 1,
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
      },
    ]);

    const { undoLastAcademicYearPromotion } = await import('@/lib/academic-year-service');
    const result = await undoLastAcademicYearPromotion(23);

    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 7',
        status: 'Active',
        graduationStatus: 'Active',
      }),
    });
    expect(txMock.studentScholarship.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ studentId: 2, scholarshipId: 5, scholarshipStatus: 'Active' }),
      ]),
      skipDuplicates: true,
    });
    expect(txMock.disbursement.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ studentId: 2, scholarshipId: 5, academicYearId: 1 }),
      ]),
      skipDuplicates: true,
    });
    expect(txMock.academicYear.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { promotionProcessedAt: null },
    });
    expect(txMock.studentAcademicRecord.deleteMany).toHaveBeenCalledWith({
      where: { academicYearId: 1 },
    });
    expect(txMock.backup.deleteMany).toHaveBeenCalledWith({
      where: { operationContext: 'ACADEMIC_YEAR_PROMOTION:1' },
    });
    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        restoredCount: 2,
        restoredScholarshipCount: 1,
        restoredDisbursementCount: 1,
      })
    );
  });
});
