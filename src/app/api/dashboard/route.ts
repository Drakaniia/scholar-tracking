import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';
import { batchQueries, generateQueryKey, queryOptimizer } from '@/lib/query-optimizer';

// Force dynamic rendering but with caching
export const dynamic = 'force-dynamic';
export const revalidate = 60; // Revalidate every 60 seconds

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sourceFilter = searchParams.get('source') || '';

    // Use server-side cache for expensive dashboard queries
    const cacheKey = generateQueryKey('dashboard-stats', { source: sourceFilter });

    const cachedData = queryOptimizer.get(cacheKey);
    if (cachedData) {
      return NextResponse.json(
        {
          success: true,
          data: cachedData,
          cached: true,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
            'CDN-Cache-Control': 'public, s-maxage=60',
            'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    // Batch all queries together for better performance
    const results = await batchQueries({
      totalStudents: () => prisma.student.count(),
      studentsWithScholarships: () =>
        prisma.studentScholarship
          .groupBy({
            by: ['studentId'],
            where: sourceFilter
              ? {
                  scholarship: {
                    source: sourceFilter,
                  },
                }
              : undefined,
            _count: { studentId: true },
          })
          .then((result) => result.length),
      totalScholarships: () =>
        prisma.scholarship.count({
          where: sourceFilter
            ? {
                source: sourceFilter,
                status: 'Active',
              }
            : undefined,
        }),
      activeScholarships: () =>
        prisma.scholarship.count({
          where: {
            status: 'Active',
            ...(sourceFilter && { source: sourceFilter }),
          },
        }),
      studentsWithGrants: () =>
        prisma.studentScholarship.aggregate({
          where: {
            scholarshipStatus: 'Active',
            ...(sourceFilter && {
              scholarship: {
                source: sourceFilter,
              },
            }),
          },
          _sum: { grantAmount: true },
        }),
      disbursements: () =>
        prisma.disbursement.aggregate({
          _sum: { amount: true },
        }),
      monthlyTrends: async () => {
        // Get recent student scholarships and disbursements
        const [scholarships, disbs] = await Promise.all([
          prisma.studentScholarship.findMany({
            take: 100,
            orderBy: { awardDate: 'desc' },
            select: {
              awardDate: true,
              grantAmount: true,
            },
          }),
          prisma.disbursement.findMany({
            take: 100,
            orderBy: { disbursementDate: 'desc' },
            select: {
              disbursementDate: true,
              amount: true,
            },
          }),
        ]);

        // Group by month (last 6 months)
        const months = [
          'Jan',
          'Feb',
          'Mar',
          'Apr',
          'May',
          'Jun',
          'Jul',
          'Aug',
          'Sep',
          'Oct',
          'Nov',
          'Dec',
        ];
        const now = new Date();
        const result: Array<{ month: string; awarded: number; disbursed: number }> = [];

        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

          const monthName = months[monthDate.getMonth()];

          const awarded = scholarships
            .filter((s) => {
              const d = new Date(s.awardDate);
              return d >= monthStart && d <= monthEnd;
            })
            .reduce((sum, s) => sum + Number(s.grantAmount), 0);

          const disbursed = disbs
            .filter((d) => {
              const date = new Date(d.disbursementDate);
              return date >= monthStart && date <= monthEnd;
            })
            .reduce((sum, d) => sum + Number(d.amount), 0);

          result.push({ month: monthName, awarded, disbursed });
        }

        return result;
      },
      recentStudents: () =>
        prisma.student.findMany({
          take: 5,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            program: true,
            gradeLevel: true,
            updatedAt: true,
            scholarships: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                scholarshipStatus: true,
                scholarship: {
                  select: {
                    id: true,
                    scholarshipName: true,
                    sponsor: true,
                  },
                },
              },
            },
          },
        }),
      studentsByGradeLevel: () =>
        prisma.student.groupBy({
          by: ['gradeLevel'],
          _count: { id: true },
        }),
    });

    const totalAmountAwarded = Number(results.studentsWithGrants._sum.grantAmount || 0);
    const totalDisbursed = Number(results.disbursements._sum.amount || 0);

    const monthlyTrends = (
      results.monthlyTrends as Array<{
        month: string;
        awarded: number;
        disbursed: number;
      }>
    ).map((row) => ({
      name: row.month,
      awarded: Number(row.awarded),
      disbursed: Number(row.disbursed),
      balance: Number(row.awarded) - Number(row.disbursed),
    }));

    // Get scholarships by type - filter by source if provided
    let scholarshipsByType;

    if (sourceFilter && (sourceFilter === 'INTERNAL' || sourceFilter === 'EXTERNAL')) {
      scholarshipsByType = await prisma.scholarship.groupBy({
        by: ['type'],
        where: {
          source: sourceFilter,
          status: 'Active',
        },
        _count: { id: true },
      });
    } else {
      scholarshipsByType = await prisma.scholarship.groupBy({
        by: ['type'],
        where: {
          status: 'Active',
        },
        _count: { id: true },
      });
    }

    const responseData = {
      stats: {
        totalStudents: results.totalStudents,
        studentsWithScholarships: results.studentsWithScholarships,
        totalScholarships: results.totalScholarships,
        activeScholarships: results.activeScholarships,
        totalAmountAwarded,
        totalDisbursed,
      },
      recentStudents: results.recentStudents,
      charts: {
        studentsByGradeLevel: results.studentsByGradeLevel,
        scholarshipsByType,
        monthlyTrends,
      },
    };

    // Cache for 90 seconds (optimized for balance between freshness and performance)
    queryOptimizer.set(cacheKey, responseData, 90 * 1000);

    return NextResponse.json(
      {
        success: true,
        data: responseData,
        cached: false,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'CDN-Cache-Control': 'public, s-maxage=60',
          'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
          'X-Cache': 'MISS',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
