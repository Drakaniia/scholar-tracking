import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/dashboard/detailed - Get detailed student report
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const sourceFilter = searchParams.get('source') || '';

        // Build where clause - include all students, filter by scholarship source if specified
        const whereClause: Prisma.StudentWhereInput = {};
        
        // Only filter by scholarship if a source is specified
        if (sourceFilter) {
            whereClause.scholarships = {
                some: {
                    scholarship: {
                        source: sourceFilter,
                    },
                },
            };
        }
        // If no source filter, don't add scholarships filter - include all students

        const students = await prisma.student.findMany({
            where: whereClause,
            orderBy: [
                { gradeLevel: 'asc' },
                { lastName: 'asc' },
            ],
            include: {
                scholarships: sourceFilter ? {
                    where: {
                        scholarship: {
                            source: sourceFilter,
                        },
                    },
                    include: {
                        scholarship: {
                            select: {
                                scholarshipName: true,
                                type: true,
                                source: true,
                            },
                        },
                    },
                } : {
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
                    // Prefer the latest edited fee record (users may update subsidies/fees without creating a new row)
                    orderBy: { updatedAt: 'desc' },
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