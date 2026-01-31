import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { batchQueries } from '@/lib/query-optimizer';

// GET /api/dashboard - Get dashboard statistics
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const sourceFilter = searchParams.get('source') || '';

        // Batch all queries together for better performance
        const results = await batchQueries({
            totalStudents: () => prisma.student.count(),
            studentsWithScholarships: () => prisma.student.count({ where: { scholarshipId: { not: null } } }),
            totalScholarships: () => prisma.scholarship.count(),
            activeScholarships: () => prisma.scholarship.count({ where: { status: 'Active' } }),
            studentsWithGrants: () => prisma.student.findMany({
                where: { 
                    grantAmount: { not: null },
                    scholarshipStatus: 'Active',
                },
                select: { grantAmount: true },
            }),
            disbursements: () => prisma.disbursement.findMany({
                select: { amount: true },
            }),
            recentStudents: () => prisma.student.findMany({
                take: 5,
                orderBy: { updatedAt: 'desc' },
                include: {
                    scholarship: true,
                },
            }),
            studentsByGradeLevel: () => prisma.student.groupBy({
                by: ['gradeLevel'],
                _count: { id: true },
            }),
        });

        const totalAmountAwarded = results.studentsWithGrants.reduce(
            (sum: number, student: { grantAmount: unknown }) => sum + Number(student.grantAmount || 0),
            0
        );

        const totalDisbursed = results.disbursements.reduce(
            (sum: number, disbursement: { amount: unknown }) => sum + Number(disbursement.amount),
            0
        );

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

        return NextResponse.json({
            success: true,
            data: {
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
            },
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                'CDN-Cache-Control': 'public, s-maxage=60',
                'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
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
