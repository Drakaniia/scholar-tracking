import { beforeEach, describe, expect, it, vi } from 'vitest';

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
    prismaMock.$transaction.mockImplementation((callback) => callback(txMock));
    txMock.academicYear.update.mockResolvedValue({});
    txMock.backup.create.mockResolvedValue({});
    txMock.backup.createMany.mockResolvedValue({ count: 0 });
    txMock.backup.deleteMany.mockResolvedValue({ count: 0 });
    txMock.disbursement.createMany.mockResolvedValue({ count: 0 });
    txMock.disbursement.deleteMany.mockResolvedValue({ count: 0 });
    txMock.disbursement.findMany.mockResolvedValue([]);
    txMock.student.update.mockResolvedValue({});
    txMock.studentAcademicRecord.create.mockResolvedValue({});
    txMock.studentAcademicRecord.deleteMany.mockResolvedValue({ count: 0 });
    txMock.studentScholarship.createMany.mockResolvedValue({ count: 0 });
    txMock.studentScholarship.deleteMany.mockResolvedValue({ count: 0 });
    txMock.studentScholarship.findMany.mockResolvedValue([]);
  });

  it('skips future promotion dates by querying only dates due in Asia/Manila', async () => {
    prismaMock.academicYear.findMany.mockResolvedValueOnce([]);
    const { runDueAcademicYearPromotions } = await import('@/lib/academic-year-service');

    const result = await runDueAcademicYearPromotions({
      now: new Date('2026-05-21T16:05:00.000Z'),
    });

    expect(prismaMock.academicYear.findMany).toHaveBeenCalledWith({
      where: {
        promotionDate: {
          lte: new Date('2026-05-22T23:59:59.999Z'),
        },
        promotionProcessedAt: null,
      },
      orderBy: {
        promotionDate: 'asc',
      },
    });
    expect(result.processedAcademicYears).toBe(0);
    expect(result.promotedCount).toBe(0);
  });

  it('does not process students when another run has already claimed the academic year', async () => {
    prismaMock.academicYear.findMany.mockResolvedValueOnce([
      {
        id: 1,
        year: '2026-2027',
        semester: '1ST',
        promotionDate: new Date('2026-05-22T00:00:00.000Z'),
        promotionProcessedAt: null,
      },
    ]);
    txMock.academicYear.updateMany.mockResolvedValueOnce({ count: 0 });
    const { runDueAcademicYearPromotions } = await import('@/lib/academic-year-service');

    const result = await runDueAcademicYearPromotions({
      now: new Date('2026-05-21T16:05:00.000Z'),
    });

    expect(txMock.student.findMany).not.toHaveBeenCalled();
    expect(txMock.student.update).not.toHaveBeenCalled();
    expect(result.processedAcademicYears).toBe(0);
    expect(result.skippedCount).toBe(1);
  });

  it('promotes every supported grade band in one bulk academic year run', async () => {
    prismaMock.academicYear.findMany.mockResolvedValueOnce([
      {
        id: 1,
        year: '2026-2027',
        semester: '1ST',
        startDate: new Date('2025-06-01T00:00:00.000Z'),
        promotionDate: new Date('2026-05-22T00:00:00.000Z'),
        promotionProcessedAt: null,
      },
    ]);
    txMock.academicYear.updateMany.mockResolvedValueOnce({ count: 1 });
    txMock.student.findMany.mockResolvedValueOnce([
      {
        id: 1,
        firstName: 'Grade',
        lastName: 'One',
        gradeLevel: 'GRADE_SCHOOL',
        yearLevel: 'Grade 1',
        program: 'Elementary',
        termType: 'SEMESTER',
      },
      {
        id: 2,
        firstName: 'Grade',
        lastName: 'Six',
        gradeLevel: 'GRADE_SCHOOL',
        yearLevel: 'Grade 6',
        program: 'Elementary',
        termType: 'SEMESTER',
      },
      {
        id: 3,
        firstName: 'Grade',
        lastName: 'Seven',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 7',
        program: 'Junior High',
        termType: 'SEMESTER',
      },
      {
        id: 4,
        firstName: 'Grade',
        lastName: 'Ten',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 10',
        program: 'Junior High',
        termType: 'SEMESTER',
        transitionDecision: 'CONTINUE_SENIOR_HIGH',
      },
      {
        id: 5,
        firstName: 'Grade',
        lastName: 'Eleven',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 11',
        program: 'STEM',
        termType: 'SEMESTER',
      },
      {
        id: 6,
        firstName: 'Grade',
        lastName: 'Twelve',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        program: 'STEM',
        termType: 'SEMESTER',
        transitionDecision: 'CONTINUE_COLLEGE',
      },
      {
        id: 7,
        firstName: 'College',
        lastName: 'One',
        gradeLevel: 'COLLEGE',
        yearLevel: '1st Year',
        program: 'BSIT',
        termType: 'TRIMESTER',
      },
      {
        id: 8,
        firstName: 'College',
        lastName: 'Two',
        gradeLevel: 'COLLEGE',
        yearLevel: '2nd Year',
        program: 'BSIT',
        termType: 'TRIMESTER',
      },
      {
        id: 9,
        firstName: 'College',
        lastName: 'Three',
        gradeLevel: 'COLLEGE',
        yearLevel: '3rd Year',
        program: 'BSIT',
        termType: 'TRIMESTER',
      },
    ]);

    const { runDueAcademicYearPromotions } = await import('@/lib/academic-year-service');
    const result = await runDueAcademicYearPromotions({
      now: new Date('2026-05-22T02:00:00.000Z'),
    });

    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 2' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: expect.objectContaining({ gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 7' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: expect.objectContaining({ gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 8' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: expect.objectContaining({ gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 11' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: expect.objectContaining({ gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 12' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 6 },
      data: expect.objectContaining({
        gradeLevel: 'COLLEGE',
        yearLevel: '1st Year',
        program: 'Undeclared College Program',
        termType: 'TRIMESTER',
      }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: expect.objectContaining({ gradeLevel: 'COLLEGE', yearLevel: '2nd Year' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 8 },
      data: expect.objectContaining({ gradeLevel: 'COLLEGE', yearLevel: '3rd Year' }),
    });
    expect(txMock.student.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: expect.objectContaining({
        graduationStatus: 'Graduated',
        status: 'Graduated',
      }),
    });
    expect(result.promotedCount).toBe(8);
    expect(result.graduatedCount).toBe(1);
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
