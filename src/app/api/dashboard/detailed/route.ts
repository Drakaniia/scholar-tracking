import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/dashboard/detailed - Get detailed student report
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const sourceFilter = searchParams.get('source') || '';

        const students = await prisma.student.findMany({
            where: {
                scholarships: {
                    some: sourceFilter ? {
                        scholarship: {
                            source: sourceFilter,
                        },
                    } : {},
                },
            },
            orderBy: [
                { gradeLevel: 'asc' },
                { lastName: 'asc' },
            ],
            include: {
                scholarships: {
                    where: sourceFilter ? {
                        scholarship: {
                            source: sourceFilter,
                        },
                    } : undefined,
                    include: {
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
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: students,
        });
    } catch (error) {
        console.error('Error fetching detailed report:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch detailed report' },
            { status: 500 }
        );
    }
}