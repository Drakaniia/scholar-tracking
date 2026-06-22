import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

// GET /api/scholarships/filter-options - Get filter options with counts based on current filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const source = searchParams.get('source') || '';
    const academicYearId = searchParams.get('academicYearId') || '';

    // Build where clause based on provided filters
    const where: Record<string, unknown> = {
      isArchived: false,
    };

    if (source && source !== 'all') {
      where.source = source;
    }

    // Filter by academic year if provided — only count scholarships that have
    // students assigned in the given academic year
    if (academicYearId) {
      where.students = {
        some: {
          academicYearId: parseInt(academicYearId),
        },
      };
    }

    // Use Promise.all to execute aggregation queries in parallel
    const [totalResult, sourceAgg, academicYearStudentCounts] = await Promise.all([
      // Get total count
      prisma.scholarship.count({ where }),
      // Get source counts
      prisma.scholarship.groupBy({
        by: ['source'],
        where,
        _count: {
          id: true,
        },
      }),
      // Get student-scholarship assignment counts per academic year (filtered by source)
      prisma.studentScholarship.groupBy({
        by: ['academicYearId'],
        where: {
          academicYearId: { not: null },
          scholarship: {
            isArchived: false,
            ...(source && source !== 'all' ? { source } : {}),
          },
        },
        _count: {
          studentId: true,
        },
      }),
    ]);

    // Convert aggregation results to count maps
    const sourceCounts: Record<string, number> = {};

    sourceAgg.forEach((item) => {
      if (item.source) {
        sourceCounts[item.source] = item._count.id;
      }
    });

    // Convert academic year counts to a record keyed by academic year ID
    const academicYearCounts: Record<string, number> = {};
    academicYearStudentCounts.forEach((item) => {
      if (item.academicYearId !== null) {
        academicYearCounts[String(item.academicYearId)] = item._count.studentId;
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          total: totalResult,
          internal: sourceCounts['INTERNAL'] || 0,
          external: sourceCounts['EXTERNAL'] || 0,
          academicYearCounts,
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
    console.error('Error fetching scholarship filter options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch filter options' },
      { status: 500 }
    );
  }
}
