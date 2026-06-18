import { NextRequest, NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';

import prisma from '@/lib/prisma';
import { generateQueryKey, queryOptimizer } from '@/lib/query-optimizer';

const CACHE_TTL = 2 * 60 * 1000;

function cacheHeaders(cacheStatus: 'HIT' | 'MISS') {
  return {
    'Cache-Control': 'private, max-age=60, stale-while-revalidate=120',
    'X-Cache': cacheStatus,
  };
}

// GET /api/dashboard/detailed - Get detailed student report
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceFilter = searchParams.get('source') || '';
    const CACHE_VERSION = 4;
    const cacheKey = generateQueryKey('dashboard-detailed', {
      source: sourceFilter || 'all',
      v: CACHE_VERSION,
    });
    const cachedData = queryOptimizer.get(cacheKey);

    if (cachedData) {
      return NextResponse.json(
        {
          success: true,
          data: cachedData,
          cached: true,
        },
        { headers: cacheHeaders('HIT') }
      );
    }

    // Build where clause - include all active, non-archived students
    const whereClause: Prisma.StudentWhereInput = {
      isArchived: false,
      status: 'Active',
    };

    // Collect filter conditions to combine with AND
    const conditions: Prisma.StudentWhereInput[] = [];

    // Filter by scholarship source if specified
    if (sourceFilter) {
      conditions.push({
        scholarships: {
          some: {
            scholarship: {
              source: sourceFilter,
            },
          },
        },
      });
    }

    if (conditions.length === 1) {
      Object.assign(whereClause, conditions[0]);
    } else if (conditions.length > 1) {
      whereClause.AND = conditions;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      orderBy: [{ gradeLevel: 'asc' }, { lastName: 'asc' }],
      select: {
        id: true,
        lastName: true,
        firstName: true,
        middleInitial: true,
        gradeLevel: true,
        yearLevel: true,
        scholarships: sourceFilter
          ? {
              where: {
                scholarship: {
                  source: sourceFilter,
                },
              },
              select: {
                academicYearId: true,
                scholarship: {
                  select: {
                    scholarshipName: true,
                    type: true,
                    source: true,
                  },
                },
              },
            }
          : {
              select: {
                academicYearId: true,
                scholarship: {
                  select: {
                    scholarshipName: true,
                    type: true,
                    source: true,
                  },
                },
              },
            },
        fees: {
          // Fetch all fee records to enable annual aggregation in reports
          orderBy: [{ academicYear: 'desc' }, { term: 'asc' }],
          select: {
            tuitionFee: true,
            otherFee: true,
            miscellaneousFee: true,
            laboratoryFee: true,
            amountSubsidy: true,
            percentSubsidy: true,
            term: true,
            academicYear: true,
            academicYearId: true,
          },
        },
      },
    });

    queryOptimizer.set(cacheKey, students, CACHE_TTL);

    return NextResponse.json(
      {
        success: true,
        data: students,
        cached: false,
      },
      { headers: cacheHeaders('MISS') }
    );
  } catch (error) {
    console.error('Error fetching detailed report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch detailed report' },
      { status: 500 }
    );
  }
}
