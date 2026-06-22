import { NextRequest, NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { resolveAcademicYearForFee } from '@/lib/academic-year-utils';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import {
  buildSearchWhere,
  generateQueryKey,
  getPaginationParams,
  queryOptimizer,
} from '@/lib/query-optimizer';
import { canManageStudentFees, canManageStudentsAndScholarships } from '@/lib/rbac';
import { validateMultipleStudentScholarshipEligibility } from '@/lib/scholarship-validation';
import { scholarshipCoversTerm } from '@/lib/terms';
import { SEPARATED_STUDENT_STATUSES } from '@/types';

const nullablePositiveIntSchema = z.preprocess(
  (value) => (value === '' || value === 'all' ? null : value),
  z.coerce.number().int().positive().nullable()
);

const nullableDateSchema = z.preprocess(
  (value) => (value === '' ? null : value),
  z.coerce.date().nullable()
);

const optionalDateSchema = z.preprocess(
  (value) => (value === '' || value === null ? undefined : value),
  z.coerce.date().optional()
);

function requiredString(message: string) {
  return z.string({ required_error: message, invalid_type_error: message }).trim().min(1, message);
}

const studentFeesInputSchema = z.object({
  tuitionFee: z.coerce.number().optional(),
  otherFee: z.coerce.number().optional(),
  miscellaneousFee: z.coerce.number().optional(),
  laboratoryFee: z.coerce.number().optional(),
  academicYearId: nullablePositiveIntSchema.optional(),
});

const studentScholarshipAssignmentSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  scholarshipId: z.coerce
    .number({
      required_error: 'Scholarship is required',
      invalid_type_error: 'Scholarship is required',
    })
    .int()
    .positive('Scholarship is required'),
  academicYearId: nullablePositiveIntSchema.optional(),
  awardDate: optionalDateSchema,
  grantAmount: z.coerce.number().optional(),
  grantType: z.enum(['FULL', 'TUITION_ONLY', 'MISC_ONLY', 'LAB_ONLY', 'NONE']).optional(),
  scholarshipStatus: z.string().optional(),
});

const createStudentInputSchema = z.object({
  lastName: requiredString('Last name is required'),
  firstName: requiredString('First name is required'),
  middleInitial: z.string().optional(),
  program: requiredString('Program is required'),
  gradeLevel: z.enum(['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'], {
    required_error: 'Grade level is required',
    invalid_type_error: 'Grade level is required',
  }),
  yearLevel: requiredString('Year level is required'),
  status: requiredString('Status is required').default('Active'),
  birthDate: nullableDateSchema.optional(),
  termType: z.enum(['SEMESTER', 'TRIMESTER']).optional(),
  academicYearId: nullablePositiveIntSchema.optional(),
  scholarshipId: nullablePositiveIntSchema.optional(),
  awardDate: nullableDateSchema.optional(),
  grantAmount: z.coerce.number().nullable().optional(),
  grantType: z.enum(['FULL', 'TUITION_ONLY', 'MISC_ONLY', 'LAB_ONLY', 'NONE']).optional(),
  scholarshipStatus: z.string().nullable().optional(),
  scholarships: z.array(studentScholarshipAssignmentSchema).optional(),
  fees: studentFeesInputSchema.optional(),
});

const createStudentsInputSchema = z.object({
  students: z.array(createStudentInputSchema).min(1, 'At least one student is required'),
});

type StudentScholarshipAssignmentInput = z.infer<typeof studentScholarshipAssignmentSchema>;
type CreateStudentPayload = z.infer<typeof createStudentInputSchema>;
type CreateStudentsPayload = {
  readonly students: CreateStudentPayload[];
  readonly isBatch: boolean;
};
type StudentRouteClient = Prisma.TransactionClient | typeof prisma;

class DuplicateStudentInRequestError extends Error {
  constructor() {
    super('Duplicate student in submission');
    this.name = 'DuplicateStudentInRequestError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCreateStudentsPayload(body: unknown): CreateStudentsPayload {
  if (isRecord(body) && 'students' in body) {
    const batch = createStudentsInputSchema.parse(body);
    return { students: batch.students, isBatch: true };
  }

  return { students: [createStudentInputSchema.parse(body)], isBatch: false };
}

function getStudentValidationDetails(error: z.ZodError): string[] {
  const details = error.issues.map((issue) => {
    const studentsSegmentIndex = issue.path.findIndex((segment) => segment === 'students');
    const studentIndex =
      studentsSegmentIndex >= 0 ? issue.path[studentsSegmentIndex + 1] : undefined;
    const prefix = typeof studentIndex === 'number' ? `Student ${studentIndex + 1}: ` : '';

    return `${prefix}${issue.message}`;
  });

  return Array.from(new Set(details));
}

function assertUniqueStudentsInRequest(students: CreateStudentPayload[]) {
  const seen = new Set<string>();

  for (const student of students) {
    const key = `${student.lastName.toUpperCase()}:${student.firstName.toUpperCase()}`;

    if (seen.has(key)) {
      throw new DuplicateStudentInRequestError();
    }

    seen.add(key);
  }
}

function parseOptionalAcademicYearId(value: unknown) {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return null;
  }

  const academicYearId = Number(value);
  if (!Number.isInteger(academicYearId) || academicYearId <= 0) {
    throw new Error('Invalid academic year');
  }

  return academicYearId;
}

function appendAcademicYearSearch(where: Record<string, unknown>, search: string) {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) {
    return where;
  }

  const academicYearSearch = {
    scholarships: {
      some: {
        academicYearRel: {
          is: {
            year: {
              contains: trimmedSearch,
              mode: 'insensitive' as const,
            },
          },
        },
      },
    },
  };

  const andConditions = where.AND;
  if (Array.isArray(andConditions)) {
    const searchCondition = andConditions[0] as { OR?: unknown[] } | undefined;
    if (searchCondition && Array.isArray(searchCondition.OR)) {
      searchCondition.OR.push(academicYearSearch);
      return where;
    }
  }

  const orConditions = where.OR;
  if (Array.isArray(orConditions)) {
    orConditions.push(academicYearSearch);
  }

  return where;
}

async function createAcademicYearResolver(
  client: Prisma.TransactionClient | typeof prisma,
  assignments: StudentScholarshipAssignmentInput[]
) {
  const requestedIds = Array.from(
    new Set(
      assignments
        .map((assignment) => parseOptionalAcademicYearId(assignment.academicYearId))
        .filter((id): id is number => id !== null)
    )
  );

  const [activeAcademicYear, academicYears] = await Promise.all([
    client.academicYear.findFirst({
      where: { isActive: true },
      select: { id: true },
    }),
    requestedIds.length > 0
      ? client.academicYear.findMany({
          where: { id: { in: requestedIds } },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  const foundIds = new Set(academicYears.map((academicYear) => academicYear.id));
  const missingId = requestedIds.find((id) => !foundIds.has(id));
  if (missingId) {
    throw new Error('Academic year not found');
  }

  return (value: unknown) => parseOptionalAcademicYearId(value) ?? activeAcademicYear?.id ?? null;
}

function assertUniqueScholarshipAssignments(
  assignments: StudentScholarshipAssignmentInput[],
  resolveAcademicYearId: (value: unknown) => number | null
) {
  const seen = new Set<string>();

  for (const assignment of assignments) {
    const academicYearId = resolveAcademicYearId(assignment.academicYearId);
    const key = `${assignment.scholarshipId}:${academicYearId ?? 'none'}`;

    if (seen.has(key)) {
      throw new Error('Duplicate scholarship assignment for academic year');
    }

    seen.add(key);
  }
}

// GET /api/students - Get all students
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const gradeLevel = searchParams.get('gradeLevel') || '';
    const program = searchParams.get('program') || '';
    const status = searchParams.get('status') || '';
    const scholarshipId = searchParams.get('scholarshipId') || '';
    const scholarshipSource = searchParams.get('scholarshipSource') || '';
    const academicYearFilter = parseOptionalAcademicYearId(searchParams.get('academicYearId'));
    const archivedParam = searchParams.get('archived');
    const includeArchived = archivedParam === 'true';
    const population = searchParams.get('population') || (includeArchived ? 'archived' : 'active');

    // Use server-side cache for student queries
    const cacheKey = generateQueryKey('students-list', {
      page,
      limit,
      search,
      gradeLevel,
      program,
      status,
      scholarshipId,
      scholarshipSource,
      academicYearId: academicYearFilter,
      archived: includeArchived,
      population,
    });
    const cachedData = queryOptimizer.get<{ students: unknown[]; total: number }>(cacheKey);

    if (cachedData) {
      return NextResponse.json(
        {
          success: true,
          data: cachedData.students,
          total: cachedData.total,
          page,
          limit,
          totalPages: Math.ceil(cachedData.total / limit),
          cached: true,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            'CDN-Cache-Control': 'public, s-maxage=60',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    const { skip, take } = getPaginationParams(page, limit);

    // Build where clause with additional filters
    const additionalFilters: Record<string, unknown> = {};
    if (gradeLevel) additionalFilters.gradeLevel = gradeLevel;
    if (program) additionalFilters.program = program;
    if (status) additionalFilters.status = status;
    if (!status && population === 'active') additionalFilters.status = 'Active';
    if (population === 'separated') {
      additionalFilters.OR = [
        { status: { in: [...SEPARATED_STUDENT_STATUSES] } },
        { graduationStatus: { in: [...SEPARATED_STUDENT_STATUSES] } },
      ];
    }

    const where = appendAcademicYearSearch(
      buildSearchWhere(search, ['lastName', 'firstName', 'program'], {
        ...additionalFilters,
        isArchived: includeArchived ? true : false,
      }),
      search
    );

    // Add scholarship filters if specified
    if (scholarshipId) {
      if (scholarshipId === 'none') {
        // Filter students with no scholarships
        Object.assign(where, {
          scholarships: {
            none: {},
          },
        });
      } else {
        // Filter students with specific scholarship
        Object.assign(where, {
          scholarships: {
            some: {
              scholarshipId: parseInt(scholarshipId),
              ...(academicYearFilter ? { academicYearId: academicYearFilter } : {}),
            },
          },
        });
      }
    } else if (scholarshipSource && scholarshipSource !== 'all') {
      Object.assign(where, {
        scholarships: {
          some: {
            ...(academicYearFilter ? { academicYearId: academicYearFilter } : {}),
            scholarship: {
              source: scholarshipSource,
            },
          },
        },
      });
    }

    // Apply academic year filter at the student level (direct field)
    if (academicYearFilter !== null) {
      // Use direct student academicYearId field for consistent filtering
      Object.assign(where, {
        academicYearId: academicYearFilter,
      });
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        select: {
          id: true,
          lastName: true,
          firstName: true,
          middleInitial: true,
          program: true,
          gradeLevel: true,
          yearLevel: true,
          status: true,
          birthDate: true,
          createdAt: true,
          updatedAt: true,
          transitionDecision: true,
          transitionDecisionAt: true,
          separatedAt: true,
          separationReason: true,
          academicYearId: true,
          scholarships: {
            select: {
              id: true,
              scholarshipId: true,
              awardDate: true,
              grantAmount: true,
              grantType: true,
              scholarshipStatus: true,
              academicYearId: true,
              academicYearRel: {
                select: {
                  id: true,
                  year: true,
                  startDate: true,
                  endDate: true,
                  semester: true,
                  isActive: true,
                },
              },
              scholarship: {
                select: {
                  id: true,
                  scholarshipName: true,
                  sponsor: true,
                  type: true,
                  source: true,
                  status: true,
                  grantType: true,
                },
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    // Cache for 90 seconds
    queryOptimizer.set(cacheKey, { students, total }, 90 * 1000);

    return NextResponse.json(
      {
        success: true,
        data: students,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        cached: false,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'CDN-Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching students:', error);
    if (error instanceof Error && error.message === 'Invalid academic year') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
  let isBatchRequest = false;

  try {
    const session = await getSession();

    if (!session || !canManageStudentsAndScholarships(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const payload = parseCreateStudentsPayload(await request.json());
    isBatchRequest = payload.isBatch;

    if (payload.students.some((student) => student.fees) && !canManageStudentFees(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to manage student fees' },
        { status: 403 }
      );
    }

    assertUniqueStudentsInRequest(payload.students);

    const createdStudents = await prisma.$transaction(async (client) => {
      const records = [];

      for (const student of payload.students) {
        records.push(await createStudentRecord(client, student));
      }

      return records;
    });

    queryOptimizer.invalidatePattern('students-list');
    queryOptimizer.invalidatePattern('scholarships-list');
    queryOptimizer.invalidatePattern('dashboard');

    if (payload.isBatch) {
      return NextResponse.json({
        success: true,
        data: createdStudents,
        message: `${createdStudents.length} students created successfully`,
      });
    }

    const createdStudent = createdStudents[0];
    if (!createdStudent) {
      throw new Error('No student was created');
    }

    return NextResponse.json({
      success: true,
      data: createdStudent,
      message: 'Student created successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = getStudentValidationDetails(error);

      return NextResponse.json(
        {
          success: false,
          error: 'Student validation failed',
          details,
        },
        { status: 400 }
      );
    }

    console.error(isBatchRequest ? 'Error creating students:' : 'Error creating student:', error);
    if (
      error instanceof Error &&
      (error.message === 'Invalid academic year' || error.message === 'Academic year not found')
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (
      error instanceof Error &&
      (error.message === 'Duplicate scholarship assignment for academic year' ||
        error.message === 'Student already exists' ||
        error instanceof DuplicateStudentInRequestError)
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      {
        success: false,
        error: isBatchRequest ? 'Failed to create students' : 'Failed to create student',
      },
      { status: 500 }
    );
  }
}

async function createStudentRecord(client: StudentRouteClient, body: CreateStudentPayload) {
  const existingStudent = await client.student.findFirst({
    where: {
      lastName: body.lastName.toUpperCase(),
      firstName: body.firstName.toUpperCase(),
      isArchived: false,
    },
  });

  if (existingStudent) {
    throw new Error('Student already exists');
  }

  const student = await client.student.create({
    data: {
      lastName: body.lastName.toUpperCase(),
      firstName: body.firstName.toUpperCase(),
      middleInitial: body.middleInitial ? body.middleInitial.toUpperCase() : null,
      program: body.program,
      gradeLevel: body.gradeLevel,
      yearLevel: body.yearLevel,
      status: body.status,
      birthDate: body.birthDate || null,
      termType: body.termType || 'SEMESTER',
      academicYearId: body.academicYearId ?? null,
    },
  });

  if (body.scholarships && body.scholarships.length > 0) {
    const scholarshipIds = body.scholarships.map((scholarship) => scholarship.scholarshipId);
    const resolveAcademicYearId = await createAcademicYearResolver(client, body.scholarships);
    assertUniqueScholarshipAssignments(body.scholarships, resolveAcademicYearId);

    await validateMultipleStudentScholarshipEligibility(student.id, scholarshipIds, client);

    await client.studentScholarship.createMany({
      data: body.scholarships.map((scholarship) => ({
        studentId: student.id,
        scholarshipId: scholarship.scholarshipId,
        awardDate: scholarship.awardDate || new Date(),
        startTerm: '',
        endTerm: '',
        grantAmount: scholarship.grantAmount || 0,
        grantType: scholarship.grantType || 'FULL',
        scholarshipStatus: scholarship.scholarshipStatus || 'Active',
        academicYearId: resolveAcademicYearId(scholarship.academicYearId),
      })),
    });
  } else if (body.scholarshipId) {
    await validateMultipleStudentScholarshipEligibility(student.id, [body.scholarshipId], client);

    await client.studentScholarship.create({
      data: {
        studentId: student.id,
        scholarshipId: body.scholarshipId,
        awardDate: body.awardDate || new Date(),
        startTerm: '',
        endTerm: '',
        grantAmount: body.grantAmount || 0,
        grantType: body.grantType || 'FULL',
        scholarshipStatus: body.scholarshipStatus || 'Active',
      },
    });
  }

  if (body.fees) {
    await createStudentFeesManual(client, student.id, body.fees);
  }

  const studentWithScholarships = await client.student.findUnique({
    where: { id: student.id },
    include: {
      scholarships: {
        include: {
          scholarship: true,
          academicYearRel: true,
        },
      },
      fees: true,
    },
  });

  return studentWithScholarships || student;
}

/**
 * Helper function to create StudentFees with manual values
 */
async function createStudentFeesManual(
  client: StudentRouteClient,
  studentId: number,
  fees: {
    tuitionFee?: number;
    otherFee?: number;
    miscellaneousFee?: number;
    laboratoryFee?: number;
    academicYearId?: number | null;
  }
) {
  // Use provided academicYearId, otherwise fall back to active academic year
  let resolvedAcademicYearId = fees.academicYearId ?? null;

  if (!resolvedAcademicYearId) {
    const currentAcademicYear = await client.academicYear.findFirst({
      where: { isActive: true },
    });
    resolvedAcademicYearId = currentAcademicYear?.id ?? null;
  }

  // Last resort: use the most recent academic year so fees always have a valid linkage
  if (!resolvedAcademicYearId) {
    const mostRecent = await client.academicYear.findFirst({
      orderBy: { year: 'desc' },
      select: { id: true },
    });
    resolvedAcademicYearId = mostRecent?.id ?? null;
  }

  const resolvedAcademicYear = resolvedAcademicYearId
    ? await client.academicYear.findUnique({
        where: { id: resolvedAcademicYearId },
        select: { id: true, year: true, semester: true },
      })
    : null;

  const { year: academicYear, termCode, term } = resolveAcademicYearForFee(resolvedAcademicYear);
  const finalAcademicYearId = resolvedAcademicYear?.id ? resolvedAcademicYear.id : null;

  // Calculate total fees
  const totalFees =
    (fees.tuitionFee || 0) +
    (fees.otherFee || 0) +
    (fees.miscellaneousFee || 0) +
    (fees.laboratoryFee || 0);

  // Calculate subsidies based on scholarships
  const studentScholarships = await client.studentScholarship.findMany({
    where: { studentId },
    include: { scholarship: true },
  });

  let totalAmountSubsidy = 0;
  for (const ss of studentScholarships) {
    if (!scholarshipCoversTerm(ss.scholarship.coveredTerms, termCode)) {
      continue;
    }
    totalAmountSubsidy += Number(ss.scholarship.amountSubsidy) || 0;
  }

  // Calculate percent subsidy (as decimal, e.g., 0.1667 for 16.67%)
  const amountSubsidy = Math.min(totalAmountSubsidy, totalFees);
  const percentSubsidy = totalFees > 0 ? Number((amountSubsidy / totalFees).toFixed(4)) : 0;

  // Check if fees already exist for this term
  const existingFees = await client.studentFees.findFirst({
    where: {
      studentId,
      term: `${term} ${academicYear}`,
      academicYear,
    },
  });

  if (existingFees) {
    // Update existing fees
    await client.studentFees.update({
      where: { id: existingFees.id },
      data: {
        tuitionFee: fees.tuitionFee || 0,
        otherFee: fees.otherFee || 0,
        miscellaneousFee: fees.miscellaneousFee || 0,
        laboratoryFee: fees.laboratoryFee || 0,
        amountSubsidy,
        percentSubsidy,
        academicYearId: finalAcademicYearId,
      },
    });
  } else {
    // Create new fees
    await client.studentFees.create({
      data: {
        studentId,
        tuitionFee: fees.tuitionFee || 0,
        otherFee: fees.otherFee || 0,
        miscellaneousFee: fees.miscellaneousFee || 0,
        laboratoryFee: fees.laboratoryFee || 0,
        amountSubsidy,
        percentSubsidy,
        term: `${term} ${academicYear}`,
        academicYear,
        academicYearId: finalAcademicYearId,
      },
    });
  }
}
