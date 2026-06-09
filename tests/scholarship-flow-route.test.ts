import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  studentScholarship: {
    findMany: vi.fn(),
  },
  disbursement: {
    findMany: vi.fn(),
  },
  studentFees: {
    findMany: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
  },
}));

const queryOptimizerMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

vi.mock('@/lib/query-optimizer', () => ({
  generateQueryKey: (_name: string, params: Record<string, unknown>) => JSON.stringify(params),
  queryOptimizer: queryOptimizerMock,
}));

function flowRequest(search = '') {
  return new NextRequest(`http://localhost/api/scholarships/flow${search}`);
}

describe('scholarship flow route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryOptimizerMock.get.mockReturnValue(null);
  });

  it('aggregates five-year awards, disbursements, fees, and scholarship load', async () => {
    prismaMock.studentScholarship.findMany.mockResolvedValueOnce([
      {
        studentId: 1,
        awardDate: new Date('2024-03-01T00:00:00.000Z'),
        grantAmount: 1000,
        scholarship: {
          scholarshipName: 'School Grant',
          source: 'INTERNAL',
          type: 'SCHOOL_GRANT',
        },
      },
      {
        studentId: 2,
        awardDate: new Date('2026-02-01T00:00:00.000Z'),
        grantAmount: 3000,
        scholarship: {
          scholarshipName: 'LGU Grant',
          source: 'EXTERNAL',
          type: 'LGU',
        },
      },
      {
        studentId: 2,
        awardDate: new Date('2026-04-01T00:00:00.000Z'),
        grantAmount: 2000,
        scholarship: {
          scholarshipName: 'TES',
          source: 'EXTERNAL',
          type: 'TES',
        },
      },
    ]);
    prismaMock.disbursement.findMany.mockResolvedValueOnce([
      {
        studentId: 2,
        disbursementDate: new Date('2026-05-01T00:00:00.000Z'),
        amount: 1200,
        scholarship: {
          scholarshipName: 'LGU Grant',
          source: 'EXTERNAL',
          type: 'LGU',
        },
      },
    ]);
    prismaMock.studentFees.findMany.mockResolvedValueOnce([
      {
        studentId: 2,
        academicYear: '2026-2027',
        amountSubsidy: 500,
      },
    ]);
    prismaMock.student.findMany.mockResolvedValueOnce([
      {
        id: 1,
        firstName: 'ANA',
        lastName: 'REYES',
        gradeLevel: 'COLLEGE',
        yearLevel: '1st Year',
        program: 'BSIT',
        scholarships: [
          {
            grantAmount: 1000,
            scholarshipStatus: 'Active',
            scholarship: {
              scholarshipName: 'School Grant',
              source: 'INTERNAL',
              type: 'SCHOOL_GRANT',
            },
          },
        ],
      },
      {
        id: 2,
        firstName: 'JOHN',
        lastName: 'CRUZ',
        gradeLevel: 'COLLEGE',
        yearLevel: '2nd Year',
        program: 'BSBA',
        scholarships: [
          {
            grantAmount: 3000,
            scholarshipStatus: 'Active',
            scholarship: {
              scholarshipName: 'LGU Grant',
              source: 'EXTERNAL',
              type: 'LGU',
            },
          },
          {
            grantAmount: 2000,
            scholarshipStatus: 'Active',
            scholarship: {
              scholarshipName: 'TES',
              source: 'EXTERNAL',
              type: 'TES',
            },
          },
        ],
      },
    ]);

    const { GET } = await import('@/app/api/scholarships/flow/route');
    const response = await GET(flowRequest('?endYear=2026'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.years).toHaveLength(5);
    expect(body.data.summary).toMatchObject({
      startYear: 2022,
      endYear: 2026,
      totalAwarded: 6000,
      totalDisbursed: 1200,
      totalAwards: 3,
      totalBeneficiaries: 2,
      singleScholarshipStudents: 1,
      multiScholarshipStudents: 1,
      maxScholarshipsPerStudent: 2,
    });
    expect(body.data.years.find((year: { year: number }) => year.year === 2026)).toMatchObject({
      awardCount: 2,
      beneficiaryCount: 1,
      awardedAmount: 5000,
      disbursedAmount: 1200,
      subsidyAmount: 500,
      externalAwards: 2,
    });
    expect(body.data.loadDistribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'one', students: 1 }),
        expect.objectContaining({ key: 'two', students: 1 }),
      ])
    );
    expect(prismaMock.studentScholarship.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              academicYearRel: {
                is: {
                  startDate: {
                    gte: new Date('2022-01-01T00:00:00.000Z'),
                    lte: new Date('2026-12-31T23:59:59.999Z'),
                  },
                },
              },
            }),
            expect.objectContaining({
              awardDate: {
                gte: new Date('2022-01-01T00:00:00.000Z'),
                lte: new Date('2026-12-31T23:59:59.999Z'),
              },
            }),
          ]),
        }),
      })
    );
    expect(prismaMock.disbursement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({
              academicYearRel: {
                is: {
                  startDate: {
                    gte: new Date('2022-01-01T00:00:00.000Z'),
                    lte: new Date('2026-12-31T23:59:59.999Z'),
                  },
                },
              },
            }),
            expect.objectContaining({
              disbursementDate: {
                gte: new Date('2022-01-01T00:00:00.000Z'),
                lte: new Date('2026-12-31T23:59:59.999Z'),
              },
            }),
          ]),
        }),
      })
    );
  });

  it('buckets linked academic-year records by academic-year start year', async () => {
    prismaMock.studentScholarship.findMany.mockResolvedValueOnce([
      {
        studentId: 7,
        awardDate: new Date('2026-06-02T00:00:00.000Z'),
        grantAmount: 2000,
        academicYearRel: {
          year: '2026-2027',
        },
        scholarship: {
          scholarshipName: 'School Grant',
          source: 'INTERNAL',
          type: 'SCHOOL_GRANT',
        },
      },
    ]);
    prismaMock.disbursement.findMany.mockResolvedValueOnce([
      {
        studentId: 7,
        disbursementDate: new Date('2027-01-15T00:00:00.000Z'),
        amount: 750,
        academicYearRel: {
          year: '2026-2027',
        },
        scholarship: {
          scholarshipName: 'School Grant',
          source: 'INTERNAL',
          type: 'SCHOOL_GRANT',
        },
      },
    ]);
    prismaMock.studentFees.findMany.mockResolvedValueOnce([
      {
        studentId: 7,
        academicYear: '2026-2027',
        amountSubsidy: 150,
      },
    ]);
    prismaMock.student.findMany.mockResolvedValueOnce([
      {
        id: 7,
        firstName: 'MAYA',
        lastName: 'SANTOS',
        gradeLevel: 'COLLEGE',
        yearLevel: '1st Year',
        program: 'BSIT',
        scholarships: [
          {
            grantAmount: 2000,
            scholarshipStatus: 'Active',
            academicYearRel: {
              year: '2026-2027',
            },
            scholarship: {
              scholarshipName: 'School Grant',
              source: 'INTERNAL',
              type: 'SCHOOL_GRANT',
            },
          },
        ],
      },
    ]);

    const { GET } = await import('@/app/api/scholarships/flow/route');
    const response = await GET(flowRequest('?endYear=2026'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.years.find((year: { year: number }) => year.year === 2026)).toMatchObject({
      awardCount: 1,
      beneficiaryCount: 1,
      awardedAmount: 2000,
      disbursementCount: 1,
      disbursedAmount: 750,
      subsidyAmount: 150,
      internalAwards: 1,
    });
    expect(body.data.summary).toMatchObject({
      totalAwarded: 2000,
      totalDisbursed: 750,
      totalBeneficiaries: 1,
      singleScholarshipStudents: 1,
      maxScholarshipsPerStudent: 1,
    });
  });
});
