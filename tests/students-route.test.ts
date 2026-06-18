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

  it('creates multiple students and returns hydrated records in one request', async () => {
    const createdStudents = [
      {
        id: 10,
        lastName: 'REYES',
        firstName: 'ANA',
        middleInitial: null,
        program: 'Grade 7',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 7',
        status: 'Active',
        birthDate: null,
      },
      {
        id: 11,
        lastName: 'SANTOS',
        firstName: 'LUIS',
        middleInitial: null,
        program: 'Grade 8',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 8',
        status: 'Active',
        birthDate: null,
      },
    ];
    const hydratedStudents = createdStudents.map((student) => ({
      ...student,
      scholarships:
        student.id === 10
          ? [
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
            ]
          : [],
    }));

    prismaMock.student.findFirst.mockResolvedValue(null);
    prismaMock.student.create
      .mockResolvedValueOnce(createdStudents[0])
      .mockResolvedValueOnce(createdStudents[1]);
    prismaMock.studentScholarship.createMany.mockResolvedValueOnce({ count: 1 });
    prismaMock.student.findUnique
      .mockResolvedValueOnce(hydratedStudents[0])
      .mockResolvedValueOnce(hydratedStudents[1]);

    const { POST } = await import('@/app/api/students/route');
    const response = await POST(
      createJsonRequest('http://localhost/api/students', 'POST', {
        students: [
          {
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
            grantAmount: 0,
            grantType: 'TUITION_ONLY',
            scholarshipStatus: 'Active',
          },
        ],
      },
      {
        lastName: 'Santos',
            firstName: 'Luis',
            program: 'Grade 8',
            gradeLevel: 'JUNIOR_HIGH',
            yearLevel: 'Grade 8',
            status: 'Active',
          },
        ],
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].scholarships).toHaveLength(1);
    expect(prismaMock.student.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.studentScholarship.createMany).toHaveBeenCalledTimes(1);
    expect(queryOptimizerMock.invalidatePattern).toHaveBeenCalledWith('students-list');
    expect(queryOptimizerMock.invalidatePattern).toHaveBeenCalledWith('dashboard');
  });

  it('returns field-specific validation details for invalid batch submissions', async () => {
    const { POST } = await import('@/app/api/students/route');
    const response = await POST(
      createJsonRequest('http://localhost/api/students', 'POST', {
        students: [
          {
            lastName: '',
            firstName: 'Ana',
            status: 'Active',
          },
        ],
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Student validation failed');
    expect(body.details).toEqual(
      expect.arrayContaining([
        'Student 1: Last name is required',
        'Student 1: Program is required',
        'Student 1: Grade level is required',
        'Student 1: Year level is required',
      ])
    );
    expect(prismaMock.student.create).not.toHaveBeenCalled();
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
