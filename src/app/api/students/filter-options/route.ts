import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { YEAR_LEVELS } from '@/types';

const SCHOOL_YEAR_LEVELS = [
  ...YEAR_LEVELS.GRADE_SCHOOL,
  ...YEAR_LEVELS.JUNIOR_HIGH,
  ...YEAR_LEVELS.SENIOR_HIGH,
];

const PROGRAM_ORDER = new Map(SCHOOL_YEAR_LEVELS.map((level, index) => [level, index]));

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

// GET /api/students/filter-options - Get filter options with counts based on current filters
// Optimized to use database-level aggregation instead of fetching all records
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const gradeLevel = searchParams.get('gradeLevel') || '';
    const program = searchParams.get('program') || '';
    const status = searchParams.get('status') || '';
    const scholarshipId = searchParams.get('scholarshipId') || '';
    const scholarshipSource = searchParams.get('scholarshipSource') || '';
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

    // Build where clause based on provided filters
    const where: Record<string, unknown> = {
      isArchived: false,
    };

    if (gradeLevel && gradeLevel !== 'all') {
      where.gradeLevel = gradeLevel;
    }
    if (program && program !== 'all') {
      where.program = program;
    }
    if (status && status !== 'all') {
      where.status = status;
    }
    if (scholarshipId && scholarshipId !== 'all' && scholarshipId !== 'none') {
      where.scholarships = {
        some: {
          scholarshipId: parseInt(scholarshipId),
        },
      };
    } else if (scholarshipId === 'none') {
      where.scholarships = {
        none: {},
      };
    } else if (scholarshipSource && scholarshipSource !== 'all') {
      where.scholarships = {
        some: {
          scholarship: {
            source: scholarshipSource,
          },
        },
      };
    }

    // Use Promise.all to execute aggregation queries in parallel
    const [programAgg, gradeLevelAgg, statusAgg, scholarshipAgg, totalResult, scholarshipsData] =
      await Promise.all([
        // Get program counts
        prisma.student.groupBy({
          by: ['program'],
          where,
          _count: {
            id: true,
          },
        }),
        // Get grade level counts
        prisma.student.groupBy({
          by: ['gradeLevel'],
          where,
          _count: {
            id: true,
          },
        }),
        // Get status counts
        prisma.student.groupBy({
          by: ['status'],
          where,
          _count: {
            id: true,
          },
        }),
        // Get scholarship counts (from student_scholarships junction table)
        prisma.studentScholarship.groupBy({
          by: ['scholarshipId'],
          where: {
            student: where,
          },
          _count: {
            studentId: true,
          },
        }),
        // Get total count
        prisma.student.count({ where }),
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

    // Calculate students without scholarship
    let studentsWithoutScholarship = 0;
    if (scholarshipId === 'none' || !scholarshipId || scholarshipId === 'all') {
      // Only calculate if not already filtered by scholarship
      if (scholarshipId !== 'none') {
        const withoutScholarshipWhere = {
          ...where,
          scholarships: {
            none: {},
          },
        };
        studentsWithoutScholarship = await prisma.student.count({
          where: withoutScholarshipWhere,
        });
      } else {
        studentsWithoutScholarship = totalResult;
      }
    }

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
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
