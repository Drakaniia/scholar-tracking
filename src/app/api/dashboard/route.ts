import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { batchQueries, queryOptimizer, generateQueryKey } from '@/lib/query-optimizer';

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
            return NextResponse.json({
                success: true,
                data: cachedData,
                cached: true,
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                    'CDN-Cache-Control': 'public, s-maxage=60',
                    'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
                    'X-Cache': 'HIT',
                },
            });
        }

        // Batch all queries together for better performance
        const results = await batchQueries({
            totalStudents: () => prisma.student.count(),
            studentsWithScholarships: () => prisma.studentScholarship.groupBy({
                by: ['studentId'],
                _count: { studentId: true },
            }).then(result => result.length),
            totalScholarships: () => prisma.scholarship.count(),
            activeScholarships: () => prisma.scholarship.count({ where: { status: 'Active' } }),
            studentsWithGrants: () => prisma.studentScholarship.aggregate({
                where: { 
                    scholarshipStatus: 'Active',
                },
                _sum: { grantAmount: true },
            }),
            disbursements: () => prisma.disbursement.aggregate({
                _sum: { amount: true },
            }),
            monthlyTrends: () => prisma.$queryRaw`
                WITH months AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', NOW() - INTERVAL '5 months'),
                        DATE_TRUNC('month', NOW()),
                        '1 month'::interval
                    ) AS month
                ),
                awarded_by_month AS (
                    SELECT 
                        DATE_TRUNC('month', ss.award_date) as month,
                        COALESCE(SUM(ss.grant_amount), 0)::numeric as total_awarded
                    FROM student_scholarships ss
                    WHERE ss.award_date >= DATE_TRUNC('month', NOW() - INTERVAL '5 months')
                        AND ss.award_date <= DATE_TRUNC('month', NOW())
                    GROUP BY DATE_TRUNC('month', ss.award_date)
                ),
                disbursed_by_month AS (
                    SELECT 
                        DATE_TRUNC('month', d.disbursement_date) as month,
                        COALESCE(SUM(d.amount), 0)::numeric as total_disbursed
                    FROM disbursements d
                    WHERE d.disbursement_date >= DATE_TRUNC('month', NOW() - INTERVAL '5 months')
                        AND d.disbursement_date <= DATE_TRUNC('month', NOW())
                    GROUP BY DATE_TRUNC('month', d.disbursement_date)
                )
                SELECT 
                    TO_CHAR(m.month, 'Mon') as month,
                    COALESCE(awarded_by_month.total_awarded, 0)::numeric as awarded,
                    COALESCE(disbursed_by_month.total_disbursed, 0)::numeric as disbursed
                FROM months m
                LEFT JOIN awarded_by_month ON DATE_TRUNC('month', awarded_by_month.month) = m.month
                LEFT JOIN disbursed_by_month ON DATE_TRUNC('month', disbursed_by_month.month) = m.month
                ORDER BY m.month ASC
            `,
            recentStudents: () => prisma.student.findMany({
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
            studentsByGradeLevel: () => prisma.student.groupBy({
                by: ['gradeLevel'],
                _count: { id: true },
            }),
        });

        const totalAmountAwarded = Number(results.studentsWithGrants._sum.grantAmount || 0);
        const totalDisbursed = Number(results.disbursements._sum.amount || 0);

        const monthlyTrends = (results.monthlyTrends as Array<{
            month: string;
            awarded: number;
            disbursed: number;
        }>).map((row) => ({
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
                    status: 'Active'
                },
                _count: { id: true },
            });
        } else {
            scholarshipsByType = await prisma.scholarship.groupBy({
                by: ['type'],
                where: {
                    status: 'Active'
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

        return NextResponse.json({
            success: true,
            data: responseData,
            cached: false,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                'CDN-Cache-Control': 'public, s-maxage=60',
                'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
                'X-Cache': 'MISS',
            },
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch dashboard statistics' },
            { status: 500 }
        );
    }
}
