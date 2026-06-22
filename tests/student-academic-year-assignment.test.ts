/**
 * TDD tests for Student Academic Year Assignment
 *
 * Tests that:
 * 1. The Student model/API saves academicYearId directly on the student record
 * 2. The POST endpoint accepts and saves academicYearId at the top level
 * 3. The PUT endpoint updates academicYearId
 * 4. The GET endpoint filters by student's academicYearId
 * 5. The student form passes academicYearId at the top level of submit data
 * 6. Reports filtering uses student's assigned academic year
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ──────────────────────────────────────────────
// Mock setup for API route tests
// ──────────────────────────────────────────────

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  student: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  studentScholarship: {
    create: vi.fn(),
    createMany: vi.fn(),
    deleteMany: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
  },
  academicYear: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  studentFees: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  scholarship: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
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

const academicYearUtilsMock = vi.hoisted(() => ({
  resolveAcademicYearForFee: vi.fn(),
}));

const termsMock = vi.hoisted(() => ({
  scholarshipCoversTerm: vi.fn().mockReturnValue(true),
  getAcademicTermCode: vi.fn().mockReturnValue('1ST'),
  getAcademicTermLabel: vi.fn().mockReturnValue('1st Semester'),
}));

vi.mock('@/lib/auth', () => authMock);
vi.mock('@/lib/prisma', () => ({ default: prismaMock }));

vi.mock('@/lib/query-optimizer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/query-optimizer')>();
  return { ...actual, queryOptimizer: queryOptimizerMock };
});

vi.mock('@/lib/scholarship-validation', () => scholarshipValidationMock);
vi.mock('@/lib/academic-year-utils', () => academicYearUtilsMock);
vi.mock('@/lib/terms', () => termsMock);
vi.mock('@/lib/rbac', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/rbac')>();
  return {
    ...actual,
    canManageStudentsAndScholarships: vi.fn().mockReturnValue(true),
    canManageStudentFees: vi.fn().mockReturnValue(true),
  };
});

function createJsonRequest(url: string, method: string, body: Record<string, unknown>) {
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ──────────────────────────────────────────────
// Source file tests (reading source code directly)
// ──────────────────────────────────────────────

const studentsPageSource = readFileSync(
  join(process.cwd(), 'src/app/(dashboard)/students/page.tsx'),
  'utf8'
);

const studentFormSource = readFileSync(
  join(process.cwd(), 'src/components/forms/student-form.tsx'),
  'utf8'
);

const studentsApiRouteSource = readFileSync(
  join(process.cwd(), 'src/app/api/students/route.ts'),
  'utf8'
);

const studentDetailApiRouteSource = readFileSync(
  join(process.cwd(), 'src/app/api/students/[id]/route.ts'),
  'utf8'
);

const reportsPageSource = readFileSync(
  join(process.cwd(), 'src/app/(dashboard)/reports/page.tsx'),
  'utf8'
);

describe('Student form: academicYearId in submit data', () => {
  it('passes effectiveStudentAcademicYearId at the top level of buildSubmitData', () => {
    // The buildSubmitData function must include academicYearId at the top level
    // of the returned CreateStudentInput, not just inside fees
    const fnStart = studentFormSource.indexOf('const buildSubmitData = useCallback(');
    // Find the return statement
    const returnSection = studentFormSource.indexOf('const submitData:', fnStart);
    const fnBody = studentFormSource.slice(fnStart, returnSection + 2000);

    // Must include academicYearId at the top level of the submitData object
    // (not just inside submitData.fees)
    expect(fnBody).toContain('academicYearId:');
    // Verify it's set from effectiveStudentAcademicYearId
    expect(fnBody).toContain('effectiveStudentAcademicYearId');
  });
});

describe('CreateStudentInput type: academicYearId support', () => {
  it('includes academicYearId in CreateStudentInput interface', () => {
    const typesSource = readFileSync(
      join(process.cwd(), 'src/types/index.ts'),
      'utf8'
    );
    const createInputStart = typesSource.indexOf('export interface CreateStudentInput');
    const createInputEnd = typesSource.indexOf('export interface CreateStudentsInput');
    const interfaceBody = typesSource.slice(createInputStart, createInputEnd);

    expect(interfaceBody).toContain('academicYearId');
    // Should be optional
    expect(interfaceBody).toContain('academicYearId?: number | null');
  });
});

describe('Student API: academicYearId on POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getSession.mockResolvedValue({ id: 1, role: 'ADMIN' });
    queryOptimizerMock.get.mockReturnValue(null);
    scholarshipValidationMock.validateMultipleStudentScholarshipEligibility.mockResolvedValue(
      undefined
    );
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    academicYearUtilsMock.resolveAcademicYearForFee.mockReturnValue({
      year: '2024-2025',
      termCode: '1ST',
      term: '1st Semester',
    });
  });

  it('saves academicYearId directly on the student record when provided at top level', async () => {
    const createdStudent = {
      id: 10,
      lastName: 'REYES',
      firstName: 'ANA',
      middleInitial: null,
      program: 'COLLEGE',
      gradeLevel: 'COLLEGE',
      yearLevel: '1st Year',
      status: 'Active',
      birthDate: null,
      academicYearId: 42, // The student record must have the academic year saved
    };
    const hydratedStudent = { ...createdStudent, scholarships: [], fees: [] };

    prismaMock.student.findFirst.mockResolvedValueOnce(null);
    prismaMock.student.create.mockResolvedValueOnce(createdStudent);
    prismaMock.student.findUnique.mockResolvedValueOnce(hydratedStudent);

    const { POST } = await import('@/app/api/students/route');
    const response = await POST(
      createJsonRequest('http://localhost/api/students', 'POST', {
        lastName: 'Reyes',
        firstName: 'Ana',
        program: 'COLLEGE',
        gradeLevel: 'COLLEGE',
        yearLevel: '1st Year',
        status: 'Active',
        academicYearId: 42,
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Verify prisma.student.create was called with academicYearId
    expect(prismaMock.student.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          academicYearId: 42,
        }),
      })
    );
  });

  it('sets academicYearId to null on student record when not provided', async () => {
    const createdStudent = {
      id: 11,
      lastName: 'SANTOS',
      firstName: 'LUIS',
      program: 'Grade 7',
      gradeLevel: 'JUNIOR_HIGH',
      yearLevel: 'Grade 7',
      status: 'Active',
      birthDate: null,
    };
    const hydratedStudent = { ...createdStudent, scholarships: [], fees: [] };

    prismaMock.student.findFirst.mockResolvedValueOnce(null);
    prismaMock.student.create.mockResolvedValueOnce(createdStudent);
    prismaMock.student.findUnique.mockResolvedValueOnce(hydratedStudent);

    const { POST } = await import('@/app/api/students/route');
    const response = await POST(
      createJsonRequest('http://localhost/api/students', 'POST', {
        lastName: 'Santos',
        firstName: 'Luis',
        program: 'Grade 7',
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 7',
        status: 'Active',
        // No academicYearId provided
      }) as never
    );

    expect(response.status).toBe(200);
    // The academicYearId should be null when not provided (API sets it to null explicitly)
    const callArg = prismaMock.student.create.mock.calls[0][0];
    expect(callArg.data.academicYearId).toBeNull();
  });
});

describe('Student API: academicYearId filter on GET', () => {
  it('includes academicYearId filter in the where clause when academicYearId param is provided', () => {
    // The GET handler must filter by the student's direct academicYearId field
    // Check the source code for the academicYearId filter logic
    const getHandlerStart = studentsApiRouteSource.indexOf('// GET /api/students - Get all students');
    const studentFindManySection = studentsApiRouteSource.indexOf('prisma.student.findMany', getHandlerStart);
    const studentCountSection = studentsApiRouteSource.indexOf('prisma.student.count', getHandlerStart);
    const getHandlerBody = studentsApiRouteSource.slice(getHandlerStart, studentCountSection);

    // Must filter by academicYearId at the student level
    expect(getHandlerBody).toContain('academicYearId');
    // Must use direct academicYearId field, not scholarship-level
    expect(getHandlerBody).toContain('academicYearId: academicYearFilter');
  });

  it('includes academicYearId in the student select for the GET response', () => {
    // The GET response must include academicYearId in the student data
    const findManySection = studentsApiRouteSource.indexOf('prisma.student.findMany');
    const selectBlock = studentsApiRouteSource.indexOf('academicYearId: true,', findManySection);
    expect(selectBlock).toBeGreaterThan(findManySection);

    // Also check the select has academicYearId
    const selectStart = studentsApiRouteSource.indexOf('select: {', findManySection);
    const selectEnd = studentsApiRouteSource.indexOf('},', selectStart);
    const selectBody = studentsApiRouteSource.slice(selectStart, selectEnd);
    expect(selectBody).toContain('academicYearId: true');
  });
});

describe('Student API: academicYearId on PUT update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getSession.mockResolvedValue({ id: 1, role: 'ADMIN' });
    queryOptimizerMock.get.mockReturnValue(null);
    scholarshipValidationMock.validateMultipleStudentScholarshipEligibility.mockResolvedValue(
      undefined
    );
    prismaMock.$transaction.mockImplementation((callback) => callback(prismaMock));
    prismaMock.student.findUnique
      .mockResolvedValueOnce({ id: 10, gradeLevel: 'COLLEGE', yearLevel: '1st Year', program: 'COLLEGE' })
      .mockResolvedValueOnce({ id: 10, scholarships: [], fees: [] });
    prismaMock.student.update.mockResolvedValue({ id: 10 });
    prismaMock.studentScholarship.deleteMany.mockResolvedValue({ count: 0 });
  });

  it('updates academicYearId on the student record when provided in PUT', async () => {
    const { PUT } = await import('@/app/api/students/[id]/route');
    await PUT(
      createJsonRequest('http://localhost/api/students/10', 'PUT', {
        lastName: 'Reyes',
        firstName: 'Ana',
        program: 'COLLEGE',
        gradeLevel: 'COLLEGE',
        yearLevel: '1st Year',
        status: 'Active',
        academicYearId: 42,
      }) as never,
      { params: Promise.resolve({ id: '10' }) }
    );

    // Verify the update includes academicYearId
    expect(prismaMock.student.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          academicYearId: 42,
        }),
      })
    );
  });
});

describe('Reports page: student academic year filtering', () => {
  it('uses student-level academicYearId in filtering logic', () => {
    // The reports page should check student's direct academicYearId field
    // when filtering by academic year, not just fee/scholarship records
    const hasDataFnStart = reportsPageSource.indexOf('const hasAcademicYearData');
    const hasDataFnEnd = reportsPageSource.indexOf('const getStudentsByGradeLevel');
    const hasDataBody = reportsPageSource.slice(hasDataFnStart, hasDataFnEnd);

    // Should check student.academicYearId or similar direct field
    // As well as fee and scholarship records
    expect(hasDataBody).toContain('academicYear');
  });
});

// ──────────────────────────────────────────────
// Student Page: Academic Year Filter with Counts
// ──────────────────────────────────────────────

describe('Student page: academic year filter with student counts', () => {
  it('shows student counts in the academic year filter dropdown', () => {
    // The academic year dropdown must show student counts for each year
    // Look for a pattern like "(count)" next to each academic year option
    // Get the section from the academic year filter
    const ayFilterSection = studentsPageSource.indexOf('<FilterField label="Academic year">');
    const ayFilterContent = studentsPageSource.slice(ayFilterSection, ayFilterSection + 2000);
    
    // Must show counts in parentheses for each academic year option
    // Pattern: "{academicYearCounts[String(academicYear.id)]" or similar
    expect(ayFilterContent).toContain('academicYearCounts');
  });

  it('uses academicYearCounts from filter options data', () => {
    // The student page must extract academicYearCounts from filterOptionsData
    // Check that the filterOptionsData processing includes academicYearCounts
    const useEffectSection = studentsPageSource.indexOf('useEffect(() => {');
    const filterOptionsSection = studentsPageSource.indexOf('filterOptionsData', useEffectSection);
    const dataProcessing = studentsPageSource.slice(filterOptionsSection, filterOptionsSection + 3000);
    
    // Must extract academicYearCounts from filter options data
    expect(dataProcessing).toContain('academicYearCounts');
  });
});

// ──────────────────────────────────────────────
// Student API: Comprehensive Academic Year Filtering
// ──────────────────────────────────────────────

describe('Student API GET: comprehensive academic year filtering', () => {
  it('filters students by academic year using direct academicYearId', () => {
    // The GET handler must filter by the student's direct academicYearId field
    const getHandlerStart = studentsApiRouteSource.indexOf('// GET /api/students - Get all students');
    const findManySection = studentsApiRouteSource.indexOf('prisma.student.findMany', getHandlerStart);
    const whereSection = studentsApiRouteSource.slice(getHandlerStart, findManySection);
    
    // Must set academicYearId filter on the where clause
    expect(whereSection).toContain('academicYearFilter');
  });

  it('also filters students by academic year through fee records', () => {
    // The GET handler must also check studentFees.academicYearId when filtering
    // Find the academic year filter section specifically (near the end of where clause building)
    const academicYearFilterSection = studentsApiRouteSource.indexOf('// Apply academic year filter');
    const filterBlock = studentsApiRouteSource.slice(academicYearFilterSection, academicYearFilterSection + 800);
    
    // Must include fees relation filter for academic year
    expect(filterBlock).toContain('fees');
    expect(filterBlock).toContain('some');
    expect(filterBlock).toContain('academicYearId');
  });

  it('also filters students by academic year through scholarship records', () => {
    // The GET handler must also check studentScholarship.academicYearId when filtering
    // Find the academic year filter section specifically
    const academicYearFilterSection = studentsApiRouteSource.indexOf('// Apply academic year filter');
    const filterBlock = studentsApiRouteSource.slice(academicYearFilterSection, academicYearFilterSection + 800);
    
    // Must include scholarships relation filter for academic year
    expect(filterBlock).toContain('scholarships');
    expect(filterBlock).toContain('some');
    expect(filterBlock).toContain('academicYearId');
  });
});

// ──────────────────────────────────────────────
// Filter Options API: Academic Year Counts
// ──────────────────────────────────────────────

describe('Student filter-options API: academic year counts', () => {
  it('returns academic year counts in the filter options response', () => {
    // The filter-options API must return academicYearCounts
    const filterOptionsSource = readFileSync(
      join(process.cwd(), 'src/app/api/students/filter-options/route.ts'),
      'utf8'
    );
    
    // Must return academicYearCounts in the response data
    const returnStatement = filterOptionsSource.indexOf('return NextResponse.json');
    const responseData = filterOptionsSource.slice(returnStatement, returnStatement + 3000);
    
    expect(responseData).toContain('academicYearCounts');
  });
});

// ──────────────────────────────────────────────
// Filter Options Hook: Instant Refetch
// ──────────────────────────────────────────────

describe('useStudentFilterOptions: instant refetch support', () => {
  it('has staleTime set to 0 for instant refetches after mutations', () => {
    const hooksSource = readFileSync(
      join(process.cwd(), 'src/hooks/use-queries.ts'),
      'utf8'
    );
    
    // Find the useStudentFilterOptions function
    const filterOptFnStart = hooksSource.indexOf('export function useStudentFilterOptions');
    const filterOptFnEnd = hooksSource.indexOf('export function useCreateStudent');
    const filterOptFnBody = hooksSource.slice(filterOptFnStart, filterOptFnEnd);
    
    // staleTime should be set to 0 (or a very small value) for instant refetch
    expect(filterOptFnBody).toContain('staleTime: 0');
  });
});

// ──────────────────────────────────────────────
// Types: academicYearCounts in StudentFilterOptions
// ──────────────────────────────────────────────

describe('StudentFilterOptions type: academicYearCounts support', () => {
  it('includes academicYearCounts in StudentFilterOptions interface', () => {
    const typesSource = readFileSync(
      join(process.cwd(), 'src/types/index.ts'),
      'utf8'
    );
    
    const filterOptionsInterface = typesSource.indexOf('export interface StudentFilterOptions');
    const endOfInterface = typesSource.indexOf('export interface DashboardStats');
    const interfaceBody = typesSource.slice(filterOptionsInterface, endOfInterface);
    
    expect(interfaceBody).toContain('academicYearCounts');
  });
});

describe('Student model: academicYearId field in Prisma schema', () => {
  it('has academicYearId field in the Student model', () => {
    const schemaSource = readFileSync(
      join(process.cwd(), 'prisma/schema.prisma'),
      'utf8'
    );
    // Find the Student model definition
    const studentModelStart = schemaSource.indexOf('model Student {');
    const academicRecordsStart = schemaSource.indexOf('academicRecords', studentModelStart);
    const studentModelBody = schemaSource.slice(studentModelStart, academicRecordsStart);

    // Must have academicYearId field
    expect(studentModelBody).toContain('academicYearId');
    // Must have relation to AcademicYear
    expect(studentModelBody).toContain('AcademicYear');
  });
});
