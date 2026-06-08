import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  studentAcademicRecord: {
    findMany: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

function registryRequest(search = '') {
  return new NextRequest(`http://localhost/api/registry${search}`);
}

describe('registry route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows current Grade 10 and Grade 12 decision states when no history exists', async () => {
    prismaMock.studentAcademicRecord.findMany.mockResolvedValueOnce([]);
    prismaMock.student.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 10,
        firstName: 'ANA',
        lastName: 'REYES',
        program: 'Grade 10',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 10',
        status: 'Active',
        graduationStatus: 'Active',
        transitionDecision: null,
        transitionDecisionAt: null,
        separatedAt: null,
        updatedAt: new Date('2026-05-31T00:00:00.000Z'),
        academicRecords: [],
      },
      {
        id: 12,
        firstName: 'MARIA',
        lastName: 'SANTOS',
        program: 'Grade 12',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        status: 'Active',
        graduationStatus: 'Active',
        transitionDecision: 'CONTINUE_COLLEGE',
        transitionDecisionAt: new Date('2026-06-01T00:00:00.000Z'),
        separatedAt: null,
        updatedAt: new Date('2026-05-31T00:00:00.000Z'),
        academicRecords: [],
      },
    ]);

    const { GET } = await import('@/app/api/registry/route');
    const response = await GET(registryRequest('?limit=50'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.total).toBe(2);
    expect(body.stats).toMatchObject({
      total: 2,
      jhsToShs: 1,
      shsToCollege: 1,
      separated: 0,
    });
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          studentId: 10,
          outcome: 'PENDING_DECISION',
          lane: 'jhs-to-shs',
          toLevel: 'Pending decision',
          canDecide: true,
          requiresDecision: true,
        }),
        expect.objectContaining({
          studentId: 12,
          outcome: 'READY_FOR_PROMOTION',
          lane: 'shs-to-college',
          toLevel: 'Continue to College',
          canDecide: true,
          requiresDecision: false,
        }),
      ])
    );
  });

  it('uses graduationStatus for separated fallback rows when current status is still Active', async () => {
    prismaMock.studentAcademicRecord.findMany.mockResolvedValueOnce([]);
    prismaMock.student.findMany
      .mockResolvedValueOnce([
        {
          id: 20,
          firstName: 'JOHN',
          lastName: 'CRUZ',
          program: 'Grade 12',
          gradeLevel: 'SENIOR_HIGH',
          yearLevel: 'Grade 12',
          status: 'Active',
          graduationStatus: 'Graduated SHS',
          transitionDecision: null,
          transitionDecisionAt: null,
          separatedAt: null,
          updatedAt: new Date('2026-05-31T00:00:00.000Z'),
          academicRecords: [],
        },
      ])
      .mockResolvedValueOnce([]);

    const { GET } = await import('@/app/api/registry/route');
    const response = await GET(registryRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0]).toMatchObject({
      studentId: 20,
      outcome: 'GRADUATED_SHS',
      status: 'GRADUATED_SHS',
      toLevel: 'Graduated SHS',
      lane: 'separated',
      canDecide: false,
      requiresDecision: false,
    });
  });

  it('shows current Grade 6 students as ready for Junior High promotion', async () => {
    prismaMock.studentAcademicRecord.findMany.mockResolvedValueOnce([]);
    prismaMock.student.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 6,
        firstName: 'MARCO',
        lastName: 'VILLANUEVA',
        program: 'Grade School',
        gradeLevel: 'GRADE_SCHOOL',
        yearLevel: 'Grade 6',
        status: 'Active',
        graduationStatus: 'Active',
        transitionDecision: null,
        transitionDecisionAt: null,
        separatedAt: null,
        updatedAt: new Date('2026-05-31T00:00:00.000Z'),
        academicRecords: [],
      },
    ]);

    const { GET } = await import('@/app/api/registry/route');
    const response = await GET(registryRequest('?limit=50&lane=grade-school-to-jhs'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.stats).toMatchObject({
      gradeSchoolToJhs: 1,
      jhsToShs: 0,
      shsToCollege: 0,
      separated: 0,
    });
    expect(body.data).toEqual([
      expect.objectContaining({
        studentId: 6,
        lane: 'grade-school-to-jhs',
        outcome: 'READY_FOR_PROMOTION',
        toLevel: 'Junior High - Grade 7',
        decisionLabel: 'Automatic promotion',
        canDecide: false,
        requiresDecision: false,
      }),
    ]);
  });

  it('returns an actionable migration error when registry tables are missing', async () => {
    prismaMock.studentAcademicRecord.findMany.mockRejectedValueOnce(
      new Error('The table public.student_academic_records does not exist')
    );
    prismaMock.student.findMany.mockResolvedValue([]);

    const { GET } = await import('@/app/api/registry/route');
    const response = await GET(registryRequest());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toContain('prisma migrate deploy');
  });
});
