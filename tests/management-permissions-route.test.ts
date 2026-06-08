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
  studentFees: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  academicYear: {
    findFirst: vi.fn(),
  },
  scholarship: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const queryOptimizerMock = vi.hoisted(() => ({
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

vi.mock('@/lib/graduation-service', () => ({
  hasStudentGraduated: vi.fn(() => false),
}));

vi.mock('@/lib/scholarship-validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/scholarship-validation')>();

  return {
    ...actual,
    ...scholarshipValidationMock,
  };
});

function jsonRequest(url: string, method: string, body: Record<string, unknown>) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function studentPayload(overrides: Record<string, unknown> = {}) {
  return {
    lastName: 'Reyes',
    firstName: 'Ana',
    program: 'Grade 7',
    gradeLevel: 'JUNIOR_HIGH',
    yearLevel: 'Grade 7',
    status: 'Active',
    ...overrides,
  };
}

function scholarshipPayload(overrides: Record<string, unknown> = {}) {
  return {
    scholarshipName: 'School Grant',
    sponsor: 'School',
    type: 'PAEB',
    source: 'INTERNAL',
    eligibleGradeLevels: 'JUNIOR_HIGH',
    amount: 1000,
    status: 'Active',
    ...overrides,
  };
}

describe('student and scholarship management permissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getSession.mockResolvedValue({ id: 2, role: 'STAFF' });
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    scholarshipValidationMock.validateMultipleStudentScholarshipEligibility.mockResolvedValue(
      undefined
    );
  });

  it('allows staff to create and update students without fee mutation access', async () => {
    const createdStudent = {
      id: 10,
      lastName: 'REYES',
      firstName: 'ANA',
      program: 'Grade 7',
      gradeLevel: 'JUNIOR_HIGH',
      yearLevel: 'Grade 7',
      status: 'Active',
      birthDate: null,
    };
    const updatedStudent = { ...createdStudent, firstName: 'MARIA' };

    prismaMock.student.findFirst.mockResolvedValueOnce(null);
    prismaMock.student.create.mockResolvedValueOnce(createdStudent);
    prismaMock.student.findUnique
      .mockResolvedValueOnce(createdStudent)
      .mockResolvedValueOnce(updatedStudent);
    prismaMock.student.update.mockResolvedValueOnce(updatedStudent);

    const studentsRoute = await import('@/app/api/students/route');
    const studentRoute = await import('@/app/api/students/[id]/route');

    const createResponse = await studentsRoute.POST(
      jsonRequest('http://localhost/api/students', 'POST', studentPayload()) as never
    );
    const updateResponse = await studentRoute.PUT(
      jsonRequest(
        'http://localhost/api/students/10',
        'PUT',
        studentPayload({ firstName: 'Maria' })
      ) as never,
      { params: Promise.resolve({ id: '10' }) }
    );

    expect(createResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
    expect(prismaMock.studentFees.create).not.toHaveBeenCalled();
    expect(prismaMock.studentFees.update).not.toHaveBeenCalled();
  });

  it('keeps student fee mutation admin-only even when staff can edit students', async () => {
    const studentsRoute = await import('@/app/api/students/route');

    const response = await studentsRoute.POST(
      jsonRequest(
        'http://localhost/api/students',
        'POST',
        studentPayload({
          fees: {
            tuitionFee: 100,
            otherFee: 0,
            miscellaneousFee: 0,
            laboratoryFee: 0,
          },
        })
      ) as never
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(prismaMock.student.create).not.toHaveBeenCalled();
  });

  it('allows staff to create and update scholarships', async () => {
    const createdScholarship = { id: 20, ...scholarshipPayload() };
    const updatedScholarship = { ...createdScholarship, sponsor: 'Updated Sponsor' };

    prismaMock.scholarship.create.mockResolvedValueOnce(createdScholarship);
    prismaMock.scholarship.findUnique.mockResolvedValueOnce(createdScholarship);
    prismaMock.scholarship.update.mockResolvedValueOnce(updatedScholarship);
    prismaMock.studentScholarship.findMany.mockResolvedValueOnce([]);

    const scholarshipsRoute = await import('@/app/api/scholarships/route');
    const scholarshipRoute = await import('@/app/api/scholarships/[id]/route');

    const createResponse = await scholarshipsRoute.POST(
      jsonRequest('http://localhost/api/scholarships', 'POST', scholarshipPayload()) as never
    );
    const updateResponse = await scholarshipRoute.PUT(
      jsonRequest(
        'http://localhost/api/scholarships/20',
        'PUT',
        scholarshipPayload({ sponsor: 'Updated Sponsor' })
      ) as never,
      { params: Promise.resolve({ id: '20' }) }
    );

    expect(createResponse.status).toBe(200);
    expect(updateResponse.status).toBe(200);
  });

  it('keeps viewers blocked from creating students and scholarships', async () => {
    authMock.getSession.mockResolvedValue({ id: 3, role: 'VIEWER' });

    const studentsRoute = await import('@/app/api/students/route');
    const scholarshipsRoute = await import('@/app/api/scholarships/route');

    const studentResponse = await studentsRoute.POST(
      jsonRequest('http://localhost/api/students', 'POST', studentPayload()) as never
    );
    const scholarshipResponse = await scholarshipsRoute.POST(
      jsonRequest('http://localhost/api/scholarships', 'POST', scholarshipPayload()) as never
    );

    expect(studentResponse.status).toBe(403);
    expect(scholarshipResponse.status).toBe(403);
  });
});
