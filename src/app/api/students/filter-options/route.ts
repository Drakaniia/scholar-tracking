import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/students/filter-options - Get filter options with counts based on current filters
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const gradeLevel = searchParams.get('gradeLevel') || '';
        const program = searchParams.get('program') || '';
        const status = searchParams.get('status') || '';
        const scholarshipId = searchParams.get('scholarshipId') || '';

        // Build where clause based on provided filters
        const where: Record<string, unknown> = {
            isArchived: false,
        };

        if (gradeLevel && gradeLevel !== 'all') {
            where.gradeLevel = gradeLevel;
        }
        if (program && program !== 'all') {
            where.program = program;
        }
        if (status && status !== 'all') {
            where.status = status;
        }
        if (scholarshipId && scholarshipId !== 'all' && scholarshipId !== 'none') {
            where.scholarships = {
                some: {
                    scholarshipId: parseInt(scholarshipId),
                },
            };
        } else if (scholarshipId === 'none') {
            where.scholarships = {
                none: {},
            };
        }

        // Get filtered students
        const students = await prisma.student.findMany({
            where,
            select: {
                program: true,
                gradeLevel: true,
                status: true,
                scholarships: {
                    select: {
                        scholarshipId: true,
                    },
                },
            },
        });

        // Calculate counts for programs
        const programCounts: Record<string, number> = {};
        const gradeLevelCounts: Record<string, number> = {};
        const statusCounts: Record<string, number> = {};
        const scholarshipCounts: Record<string, number> = {};
        let studentsWithoutScholarship = 0;

        students.forEach(student => {
            // Program counts
            programCounts[student.program] = (programCounts[student.program] || 0) + 1;
            
            // Grade level counts
            gradeLevelCounts[student.gradeLevel] = (gradeLevelCounts[student.gradeLevel] || 0) + 1;
            
            // Status counts
            statusCounts[student.status] = (statusCounts[student.status] || 0) + 1;

            // Scholarship counts
            if (student.scholarships && student.scholarships.length > 0) {
                student.scholarships.forEach(ss => {
                    const key = ss.scholarshipId.toString();
                    scholarshipCounts[key] = (scholarshipCounts[key] || 0) + 1;
                });
            } else {
                studentsWithoutScholarship++;
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                programs: Object.keys(programCounts).sort(),
                programCounts,
                gradeLevelCounts,
                statusCounts,
                scholarshipCounts,
                studentsWithoutScholarship,
                total: students.length,
            },
        });
    } catch (error) {
        console.error('Error fetching filter options:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch filter options' },
            { status: 500 }
        );
    }
}
