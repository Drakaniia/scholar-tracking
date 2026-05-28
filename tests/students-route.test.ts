import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  student: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  studentScholarship: {
    create: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
  },
  academicYear: {
    findFirst: vi.fn(),
  },
  studentFees: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const queryOptimizerMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  invalidatePattern: vi.fn(),
}));

const scholarshipValidationMock = vi.hoisted(() => ({
  validateMultipleStudentScholarshipEligibility: vi.fn(),
}));

vi.mock('@/lib/auth', () => authMock);

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

vi.mock('@/lib/query-optimizer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/query-optimizer')>();

  return {
    ...actual,
    queryOptimizer: queryOptimizerMock,
  };
});

vi.mock('@/lib/scholarship-validation', () => scholarshipValidationMock);

function createJsonRequest(url: string, method: string, body: Record<string, unknown>) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('students route scholarship saves', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getSession.mockResolvedValue({ id: 1, role: 'ADMIN' });
    queryOptimizerMock.get.mockReturnValue(null);
    scholarshipValidationMock.validateMultipleStudentScholarshipEligibility.mockResolvedValue(
      undefined
    );
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
  });

  it('creates scholarship assignments and returns a hydrated student for immediate display', async () => {
    const createdStudent = {
      id: 10,
      lastName: 'REYES',
      firstName: 'ANA',
      middleInitial: null,
      program: 'Grade 7',
      gradeLevel: 'JUNIOR_HIGH',
      yearLevel: 'Grade 7',
      status: 'Active',
      birthDate: null,
    };
    const hydratedStudent = {
      ...createdStudent,
      scholarships: [
        {
          id: 50,
          studentId: 10,
          scholarshipId: 3,
          grantType: 'TUITION_ONLY',
          scholarshipStatus: 'Active',
          scholarship: {
            id: 3,
            scholarshipName: 'Junior High Grant',
          },
        },
      ],
    };

    prismaMock.student.findFirst.mockResolvedValueOnce(null);
    prismaMock.student.create.mockResolvedValueOnce(createdStudent);
    prismaMock.studentScholarship.createMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.student.findUnique.mockResolvedValueOnce(hydratedStudent);

    const { POST } = await import('@/app/api/students/route');
    const response = await POST(
      createJsonRequest('http://localhost/api/students', 'POST', {
        lastName: 'Reyes',
        firstName: 'Ana',
        program: 'Grade 7',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 7',
        status: 'Active',
        scholarships: [
          {
            scholarshipId: 3,
            awardDate: '2026-05-28T00:00:00.000Z',
            startTerm: '1st Semester AY 2026-2027',
            endTerm: '2nd Semester AY 2026-2027',
            grantAmount: 0,
            grantType: 'TUITION_ONLY',
            scholarshipStatus: 'Active',
          },
        ],
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.scholarships).toHaveLength(1);
    expect(body.data.scholarships[0].scholarship.scholarshipName).toBe('Junior High Grant');
    expect(prismaMock.studentScholarship.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studentId: 10,
          scholarshipId: 3,
          grantType: 'TUITION_ONLY',
          scholarshipStatus: 'Active',
        }),
      ],
    });
    expect(queryOptimizerMock.invalidatePattern).toHaveBeenCalledWith('students-list');
    expect(queryOptimizerMock.invalidatePattern).toHaveBeenCalledWith('dashboard');
  });

  it('preserves grant type when updating scholarship assignments', async () => {
    const currentStudent = {
      id: 10,
      lastName: 'REYES',
      firstName: 'ANA',
      middleInitial: null,
      program: 'Grade 7',
      gradeLevel: 'JUNIOR_HIGH',
      yearLevel: 'Grade 7',
      status: 'Active',
      birthDate: null,
    };
    const updatedStudent = {
      ...currentStudent,
      scholarships: [
        {
          id: 51,
          studentId: 10,
          scholarshipId: 4,
          grantType: 'NONE',
          scholarshipStatus: 'Active',
          scholarship: {
            id: 4,
            scholarshipName: 'Honor Scholar',
          },
        },
      ],
    };

    prismaMock.student.findUnique
      .mockResolvedValueOnce(currentStudent)
      .mockResolvedValueOnce(updatedStudent);
    prismaMock.student.update.mockResolvedValueOnce(currentStudent);
    prismaMock.studentScholarship.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.studentScholarship.createMany.mockResolvedValueOnce({ count: 1 });

    const { PUT } = await import('@/app/api/students/[id]/route');
    const response = await PUT(
      createJsonRequest('http://localhost/api/students/10', 'PUT', {
        lastName: 'Reyes',
        firstName: 'Ana',
        program: 'Grade 7',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 7',
        status: 'Active',
        scholarships: [
          {
            scholarshipId: 4,
            awardDate: '2026-05-28T00:00:00.000Z',
            startTerm: '1st Semester AY 2026-2027',
            endTerm: '2nd Semester AY 2026-2027',
            grantAmount: 0,
            grantType: 'NONE',
            scholarshipStatus: 'Active',
          },
        ],
      }) as never,
      { params: Promise.resolve({ id: '10' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.scholarships).toHaveLength(1);
    expect(prismaMock.studentScholarship.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studentId: 10,
          scholarshipId: 4,
          grantType: 'NONE',
          scholarshipStatus: 'Active',
        }),
      ],
    });
  });
});
