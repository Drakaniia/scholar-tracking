import { NextRequest, NextResponse } from 'next/server';

import type { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';
import { buildSearchWhere } from '@/lib/query-optimizer';
import { SEPARATED_STUDENT_STATUSES, YEAR_LEVELS } from '@/types';

const SCHOOL_YEAR_LEVELS = [
  ...YEAR_LEVELS.GRADE_SCHOOL,
  ...YEAR_LEVELS.JUNIOR_HIGH,
  ...YEAR_LEVELS.SENIOR_HIGH,
];

const PROGRAM_ORDER = new Map(SCHOOL_YEAR_LEVELS.map((level, index) => [level, index]));
const STUDENT_SEARCH_FIELDS = ['lastName', 'firstName', 'program'];

type StudentFilterInput = {
  search: string;
  gradeLevel: string;
  program: string;
  status: string;
  scholarshipId: string;
  scholarshipSource: string;
  academicYearId: string;
  includeArchived: boolean;
  population: string;
};

type OmittedStudentFacet =
  | 'gradeLevel'
  | 'program'
  | 'status'
  | 'scholarshipId'
  | 'scholarshipSource'
  | 'academicYearId';

function parseAcademicYearFilter(value: string) {
  if (!value || value === 'all') return null;

  const academicYearId = Number(value);
  if (!Number.isInteger(academicYearId) || academicYearId <= 0) {
    throw new Error('Invalid academic year');
  }

  return academicYearId;
}

function appendAcademicYearSearch(where: Prisma.StudentWhereInput, search: string) {
  const trimmedSearch = search.trim();
  if (!trimmedSearch) {
    return where;
  }

  const academicYearSearch: Prisma.StudentWhereInput = {
    scholarships: {
      some: {
        academicYearRel: {
          is: {
            year: {
              contains: trimmedSearch,
              mode: 'insensitive',
            },
          },
        },
      },
    },
  };

  if (Array.isArray(where.AND)) {
    const firstCondition = where.AND[0] as Prisma.StudentWhereInput | undefined;
    if (firstCondition && Array.isArray(firstCondition.OR)) {
      firstCondition.OR.push(academicYearSearch);
      return where;
    }
  }

  if (Array.isArray(where.OR)) {
    where.OR.push(academicYearSearch);
    return where;
  }

  return where;
}

function sortProgramOptions(programs: string[]) {
  return programs.sort((a, b) => {
    const aOrder = PROGRAM_ORDER.get(a);
    const bOrder = PROGRAM_ORDER.get(b);

    if (aOrder !== undefined && bOrder !== undefined) return aOrder - bOrder;
    if (aOrder !== undefined) return -1;
    if (bOrder !== undefined) return 1;

    return a.localeCompare(b);
  });
}

function buildStudentWhere(
  filters: StudentFilterInput,
  omittedFacets: OmittedStudentFacet[] = []
): Prisma.StudentWhereInput {
  const omitted = new Set(omittedFacets);
  const additionalFilters: Prisma.StudentWhereInput = {};

  if (filters.gradeLevel && filters.gradeLevel !== 'all' && !omitted.has('gradeLevel')) {
    additionalFilters.gradeLevel = filters.gradeLevel;
  }

  if (filters.program && filters.program !== 'all' && !omitted.has('program')) {
    additionalFilters.program = filters.program;
  }

  if (filters.status && filters.status !== 'all' && !omitted.has('status')) {
    additionalFilters.status = filters.status;
  } else if (filters.population === 'active' && !omitted.has('status')) {
    additionalFilters.status = 'Active';
  }

  if (filters.population === 'separated') {
    additionalFilters.OR = [
      { status: { in: [...SEPARATED_STUDENT_STATUSES] } },
      { graduationStatus: { in: [...SEPARATED_STUDENT_STATUSES] } },
    ];
  }

  const scholarshipRelationWhere: Prisma.StudentScholarshipWhereInput = {};

  if (filters.scholarshipId && filters.scholarshipId !== 'all' && !omitted.has('scholarshipId')) {
    if (filters.scholarshipId === 'none') {
      additionalFilters.scholarships = {
        none: {},
      };
    } else {
      scholarshipRelationWhere.scholarshipId = parseInt(filters.scholarshipId);
    }
  }

  if (
    filters.scholarshipSource &&
    filters.scholarshipSource !== 'all' &&
    !omitted.has('scholarshipSource')
  ) {
    scholarshipRelationWhere.scholarship = {
      source: filters.scholarshipSource,
    };
  }

  if (
    filters.academicYearId &&
    filters.academicYearId !== 'all' &&
    !omitted.has('academicYearId')
  ) {
    additionalFilters.academicYearId = parseAcademicYearFilter(filters.academicYearId);
  }

  if (Object.keys(scholarshipRelationWhere).length > 0 && filters.scholarshipId !== 'none') {
    additionalFilters.scholarships = {
      some: scholarshipRelationWhere,
    };
  }

  const where = buildSearchWhere(filters.search, STUDENT_SEARCH_FIELDS, {
    ...additionalFilters,
    isArchived: filters.includeArchived,
  }) as Prisma.StudentWhereInput;

  return appendAcademicYearSearch(where, filters.search);
}

// GET /api/students/filter-options - Get filter options with counts based on current filters
// Optimized to use database-level aggregation instead of fetching all records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const gradeLevel = searchParams.get('gradeLevel') || '';
    const program = searchParams.get('program') || '';
    const status = searchParams.get('status') || '';
    const scholarshipId = searchParams.get('scholarshipId') || '';
    const scholarshipSource = searchParams.get('scholarshipSource') || '';
    const academicYearId = searchParams.get('academicYearId') || '';
    const includeArchived = searchParams.get('archived') === 'true';
    const population = searchParams.get('population') || (includeArchived ? 'archived' : 'active');
    const filters: StudentFilterInput = {
      search,
      gradeLevel,
      program,
      status,
      scholarshipId,
      scholarshipSource,
      academicYearId,
      includeArchived,
      population,
    };
    const canonicalProgramOptions =
      gradeLevel === 'GRADE_SCHOOL'
        ? YEAR_LEVELS.GRADE_SCHOOL
        : gradeLevel === 'JUNIOR_HIGH'
          ? YEAR_LEVELS.JUNIOR_HIGH
          : gradeLevel === 'SENIOR_HIGH'
            ? YEAR_LEVELS.SENIOR_HIGH
            : !gradeLevel || gradeLevel === 'all'
              ? SCHOOL_YEAR_LEVELS
              : [];

    const filteredWhere = buildStudentWhere(filters);
    const gradeLevelFacetWhere = buildStudentWhere(filters, ['gradeLevel']);
    const programFacetWhere = buildStudentWhere(filters, ['program']);
    const statusFacetWhere = buildStudentWhere(filters, ['status']);
    const scholarshipFacetWhere = buildStudentWhere(filters, ['scholarshipId']);
    const noScholarshipFacetWhere = buildStudentWhere(filters, [
      'scholarshipId',
      'scholarshipSource',
    ]);

    const scholarshipRelationWhere: Prisma.StudentScholarshipWhereInput = {
      student: scholarshipFacetWhere,
      scholarship: {
        isArchived: false,
        ...(scholarshipSource && scholarshipSource !== 'all' ? { source: scholarshipSource } : {}),
      },
      ...(academicYearId && academicYearId !== 'all'
        ? { academicYearId: parseAcademicYearFilter(academicYearId) }
        : {}),
    };

    // Use Promise.all to execute aggregation queries in parallel
    const [
      programAgg,
      gradeLevelAgg,
      statusAgg,
      scholarshipAgg,
      totalResult,
      scholarshipFacetTotal,
      studentsWithoutScholarship,
      scholarshipsData,
    ] = await Promise.all([
      // Get program counts
      prisma.student.groupBy({
        by: ['program'],
        where: programFacetWhere,
        _count: {
          id: true,
        },
      }),
      // Get grade level counts
      prisma.student.groupBy({
        by: ['gradeLevel'],
        where: gradeLevelFacetWhere,
        _count: {
          id: true,
        },
      }),
      // Get status counts
      prisma.student.groupBy({
        by: ['status'],
        where: statusFacetWhere,
        _count: {
          id: true,
        },
      }),
      // Get scholarship counts (from student_scholarships junction table)
      prisma.studentScholarship.groupBy({
        by: ['scholarshipId'],
        where: scholarshipRelationWhere,
        _count: {
          studentId: true,
        },
      }),
      // Get total count
      prisma.student.count({ where: filteredWhere }),
      // Get count after clearing only the scholarship dropdown
      prisma.student.count({ where: scholarshipFacetWhere }),
      // Get students that would match if "No Scholarship" is selected
      prisma.student.count({
        where: {
          AND: [
            noScholarshipFacetWhere,
            {
              scholarships: {
                none: {},
              },
            },
          ],
        },
      }),
      // Get all scholarships for the dropdown
      prisma.scholarship.findMany({
        where: {
          isArchived: false,
          ...(scholarshipSource && scholarshipSource !== 'all'
            ? { source: scholarshipSource }
            : {}),
        },
        select: {
          id: true,
          scholarshipName: true,
          source: true,
        },
        orderBy: [{ source: 'asc' }, { scholarshipName: 'asc' }],
      }),
    ]);

    // Convert aggregation results to count maps
    const programCounts: Record<string, number> = {};
    const gradeLevelCounts: Record<string, number> = {};
    const statusCounts: Record<string, number> = {};
    const dynamicScholarshipCounts: Record<string, number> = {};

    programAgg.forEach((item) => {
      if (item.program) {
        programCounts[item.program] = item._count.id;
      }
    });

    gradeLevelAgg.forEach((item) => {
      if (item.gradeLevel) {
        gradeLevelCounts[item.gradeLevel] = item._count.id;
      }
    });

    statusAgg.forEach((item) => {
      if (item.status) {
        statusCounts[item.status] = item._count.id;
      }
    });

    scholarshipAgg.forEach((item) => {
      if (item.scholarshipId) {
        dynamicScholarshipCounts[item.scholarshipId.toString()] = item._count.studentId;
      }
    });

    const gradeLevelFacetTotal = gradeLevelAgg.reduce((sum, item) => sum + item._count.id, 0);
    const programFacetTotal = programAgg.reduce((sum, item) => sum + item._count.id, 0);
    const statusFacetTotal = statusAgg.reduce((sum, item) => sum + item._count.id, 0);

    return NextResponse.json(
      {
        success: true,
        data: {
          programs: sortProgramOptions(
            Array.from(new Set([...canonicalProgramOptions, ...Object.keys(programCounts)]))
          ),
          programCounts,
          gradeLevelCounts,
          statusCounts,
          dynamicScholarshipCounts,
          scholarships: scholarshipsData,
          studentsWithoutScholarship,
          facetTotals: {
            gradeLevel: gradeLevelFacetTotal,
            program: programFacetTotal,
            status: statusFacetTotal,
            scholarship: scholarshipFacetTotal,
          },
          total: totalResult,
          filteredTotal: totalResult,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          'X-Cache-Source': 'database-aggregation',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching filter options:', error);
    if (error instanceof Error && error.message === 'Invalid academic year') {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
