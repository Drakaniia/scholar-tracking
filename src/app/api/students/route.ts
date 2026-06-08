import { NextRequest, NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';

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
import { getAcademicTermCode, getAcademicTermLabel, scholarshipCoversTerm } from '@/lib/terms';
import { CreateStudentInput, SEPARATED_STUDENT_STATUSES } from '@/types';

type StudentScholarshipAssignmentInput = NonNullable<CreateStudentInput['scholarships']>[number];

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
    } else if ((scholarshipSource && scholarshipSource !== 'all') || academicYearFilter !== null) {
      Object.assign(where, {
        scholarships: {
          some: {
            ...(academicYearFilter ? { academicYearId: academicYearFilter } : {}),
            ...(scholarshipSource && scholarshipSource !== 'all'
              ? {
                  scholarship: {
                    source: scholarshipSource,
                  },
                }
              : {}),
          },
        },
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
          scholarships: {
            select: {
              id: true,
              scholarshipId: true,
              awardDate: true,
              startTerm: true,
              endTerm: true,
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
  try {
    const session = await getSession();

    if (!session || !canManageStudentsAndScholarships(session.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body: CreateStudentInput = await request.json();

    if (body.fees && !canManageStudentFees(session.role)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized to manage student fees' },
        { status: 403 }
      );
    }

    // Check if student with same name already exists
    const existingStudent = await prisma.student.findFirst({
      where: {
        lastName: body.lastName.toUpperCase(),
        firstName: body.firstName.toUpperCase(),
        isArchived: false,
      },
    });

    if (existingStudent) {
      return NextResponse.json(
        { success: false, error: 'Student already exists' },
        { status: 409 }
      );
    }

    const student = await prisma.student.create({
      data: {
        lastName: body.lastName.toUpperCase(),
        firstName: body.firstName.toUpperCase(),
        middleInitial: body.middleInitial ? body.middleInitial.toUpperCase() : null,
        program: body.program,
        gradeLevel: body.gradeLevel,
        yearLevel: body.yearLevel,
        status: body.status,
        birthDate: body.birthDate || null,
      },
    });

    // Handle multiple scholarships if provided

    if (body.scholarships && body.scholarships.length > 0) {
      // Validate scholarship assignments before creating them

      const scholarshipIds = body.scholarships.map((s) => s.scholarshipId);
      const resolveAcademicYearId = await createAcademicYearResolver(prisma, body.scholarships);
      assertUniqueScholarshipAssignments(body.scholarships, resolveAcademicYearId);

      await validateMultipleStudentScholarshipEligibility(student.id, scholarshipIds);

      await prisma.studentScholarship.createMany({
        data: body.scholarships.map((scholarship) => ({
          studentId: student.id,

          scholarshipId: scholarship.scholarshipId,

          awardDate: scholarship.awardDate || new Date(),

          startTerm: scholarship.startTerm || '',

          endTerm: scholarship.endTerm || '',

          grantAmount: scholarship.grantAmount || 0,

          grantType: scholarship.grantType || 'FULL',

          scholarshipStatus: scholarship.scholarshipStatus || 'Active',

          academicYearId: resolveAcademicYearId(scholarship.academicYearId),
        })),
      });
    }

    // Fallback to single scholarship for backward compatibility
    else if (body.scholarshipId) {
      // Validate scholarship assignment before creating it

      await validateMultipleStudentScholarshipEligibility(student.id, [body.scholarshipId]);

      await prisma.studentScholarship.create({
        data: {
          studentId: student.id,

          scholarshipId: body.scholarshipId,

          awardDate: body.awardDate || new Date(),

          startTerm: body.startTerm || '',

          endTerm: body.endTerm || '',

          grantAmount: body.grantAmount || 0,

          scholarshipStatus: body.scholarshipStatus || 'Active',
        },
      });
    }

    if (body.fees) {
      await createStudentFeesManual(student.id, body.fees);
    }

    const studentWithScholarships = await prisma.student.findUnique({
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

    queryOptimizer.invalidatePattern('students-list');
    queryOptimizer.invalidatePattern('dashboard');

    return NextResponse.json({
      success: true,
      data: studentWithScholarships || student,
      message: 'Student created successfully',
    });
  } catch (error) {
    console.error('Error creating student:', error);
    if (
      error instanceof Error &&
      (error.message === 'Invalid academic year' || error.message === 'Academic year not found')
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (
      error instanceof Error &&
      error.message === 'Duplicate scholarship assignment for academic year'
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create student' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to create StudentFees with manual values
 */
async function createStudentFeesManual(
  studentId: number,
  fees: {
    tuitionFee?: number;
    otherFee?: number;
    miscellaneousFee?: number;
    laboratoryFee?: number;
  }
) {
  // Get current academic year
  const currentAcademicYear = await prisma.academicYear.findFirst({
    where: { isActive: true },
  });

  const termCode = getAcademicTermCode(currentAcademicYear?.semester);
  const term = getAcademicTermLabel(termCode);

  const academicYear = currentAcademicYear?.year || new Date().getFullYear().toString();
  const academicYearId = currentAcademicYear?.id || null;

  // Calculate total fees
  const totalFees =
    (fees.tuitionFee || 0) +
    (fees.otherFee || 0) +
    (fees.miscellaneousFee || 0) +
    (fees.laboratoryFee || 0);

  // Calculate subsidies based on scholarships
  const studentScholarships = await prisma.studentScholarship.findMany({
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
  const existingFees = await prisma.studentFees.findFirst({
    where: {
      studentId,
      term: `${term} ${academicYear}`,
      academicYear,
    },
  });

  if (existingFees) {
    // Update existing fees
    await prisma.studentFees.update({
      where: { id: existingFees.id },
      data: {
        tuitionFee: fees.tuitionFee || 0,
        otherFee: fees.otherFee || 0,
        miscellaneousFee: fees.miscellaneousFee || 0,
        laboratoryFee: fees.laboratoryFee || 0,
        amountSubsidy,
        percentSubsidy,
        academicYearId,
      },
    });
  } else {
    // Create new fees
    await prisma.studentFees.create({
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
        academicYearId,
      },
    });
  }
}
