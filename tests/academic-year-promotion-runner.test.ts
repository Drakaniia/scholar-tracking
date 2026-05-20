import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  academicYear: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
}));

const txMock = vi.hoisted(() => ({
  academicYear: {
    updateMany: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  disbursement: {
    deleteMany: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  studentScholarship: {
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
});
