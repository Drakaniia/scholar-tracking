import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
    try {
        // Get basic counts
        const [
            totalStudents,
            studentsWithScholarships,
            totalScholarships,
            activeScholarships,
        ] = await Promise.all([
            prisma.student.count(),
            prisma.student.count({ where: { scholarshipId: { not: null } } }),
            prisma.scholarship.count(),
            prisma.scholarship.count({ where: { status: 'Active' } }),
        ]);

        // Get students with active scholarships for total awarded
        const studentsWithGrants = await prisma.student.findMany({
            where: { 
                grantAmount: { not: null },
                scholarshipStatus: 'Active',
            },
            select: { grantAmount: true },
        });

        const totalAmountAwarded = studentsWithGrants.reduce(
            (sum, student) => sum + Number(student.grantAmount || 0),
            0
        );

        // Get total disbursed
        const disbursements = await prisma.disbursement.findMany({
            select: { amount: true },
        });

        const totalDisbursed = disbursements.reduce(
            (sum, disbursement) => sum + Number(disbursement.amount),
            0
        );

        // Get recent students with scholarships
        const recentStudents = await prisma.student.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' },
            include: {
                scholarship: true,
            },
        });

        // Get students by grade level
        const studentsByGradeLevel = await prisma.student.groupBy({
            by: ['gradeLevel'],
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
                    studentsWithScholarships,
                    totalScholarships,
                    activeScholarships,
                    totalAmountAwarded,
                    totalDisbursed,
                },
                recentStudents,
                charts: {
                    studentsByGradeLevel,
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
