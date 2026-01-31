import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { batchQueries, queryOptimizer, generateQueryKey } from '@/lib/query-optimizer';

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
                    'Cache-Control': 'public, s-maxage=90, stale-while-revalidate=180',
                    'CDN-Cache-Control': 'public, s-maxage=90',
                    'Vercel-CDN-Cache-Control': 'public, s-maxage=90',
                    'X-Cache': 'HIT',
                },
            });
        }

        // Batch all queries together for better performance
        const results = await batchQueries({
            totalStudents: () => prisma.student.count(),
            studentsWithScholarships: () => prisma.student.count({ where: { scholarshipId: { not: null } } }),
            totalScholarships: () => prisma.scholarship.count(),
            activeScholarships: () => prisma.scholarship.count({ where: { status: 'Active' } }),
            studentsWithGrants: () => prisma.student.aggregate({
                where: { 
                    grantAmount: { not: null },
                    scholarshipStatus: 'Active',
                },
                _sum: { grantAmount: true },
            }),
            disbursements: () => prisma.disbursement.aggregate({
                _sum: { amount: true },
            }),
            recentStudents: () => prisma.student.findMany({
                take: 5,
                orderBy: { updatedAt: 'desc' },
                select: {
                    id: true,
                    studentNo: true,
                    firstName: true,
                    lastName: true,
                    program: true,
                    gradeLevel: true,
                    scholarshipStatus: true,
                    updatedAt: true,
                    scholarship: {
                        select: {
                            id: true,
                            scholarshipName: true,
                            sponsor: true,
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
            },
        };

        // Cache for 2 minutes (120 seconds)
        queryOptimizer.set(cacheKey, responseData, 120 * 1000);

        return NextResponse.json({
            success: true,
            data: responseData,
            cached: false,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=90, stale-while-revalidate=180',
                'CDN-Cache-Control': 'public, s-maxage=90',
                'Vercel-CDN-Cache-Control': 'public, s-maxage=90',
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
