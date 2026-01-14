import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
    try {
        const [
            totalStudents,
            totalScholarships,
            activeScholarships,
            pendingApplications,
            approvedApplications,
            awardsData,
        ] = await Promise.all([
            prisma.student.count(),
            prisma.scholarship.count(),
            prisma.scholarship.count({ where: { status: 'Active' } }),
            prisma.application.count({ where: { status: 'Pending' } }),
            prisma.application.count({ where: { status: 'Approved' } }),
            prisma.award.findMany({
                select: { grantAmount: true },
            }),
        ]);

        const totalAmountAwarded = awardsData.reduce(
            (sum, award) => sum + Number(award.grantAmount),
            0
        );

        // Get recent applications
        const recentApplications = await prisma.application.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                student: true,
                scholarship: true,
            },
        });

        // Get students by year level
        const studentsByYearLevel = await prisma.student.groupBy({
            by: ['yearLevel'],
            _count: { id: true },
        });

        // Get scholarships by type
        const scholarshipsByType = await prisma.scholarship.groupBy({
            by: ['type'],
            _count: { id: true },
        });

        return NextResponse.json({
            success: true,
            data: {
                stats: {
                    totalStudents,
                    totalScholarships,
                    activeScholarships,
                    pendingApplications,
                    approvedApplications,
                    totalAmountAwarded,
                },
                recentApplications,
                charts: {
                    studentsByYearLevel,
                    scholarshipsByType,
                },
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
