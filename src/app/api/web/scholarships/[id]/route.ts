import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserFromRequest, isStudent } from '@/lib/auth';

// GET /api/web/scholarships/[id] - Get single scholarship details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUserFromRequest(request);

        if (!user || !isStudent(user) || !user.studentId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const scholarshipId = parseInt(id);
        const studentId = user.studentId;

        const scholarship = await prisma.scholarship.findUnique({
            where: { id: scholarshipId },
        });

        if (!scholarship) {
            return NextResponse.json(
                { success: false, error: 'Scholarship not found' },
                { status: 404 }
            );
        }

        // Check if student has already applied
        const existingApplication = await prisma.studentScholarship.findUnique({
            where: {
                studentId_scholarshipId: {
                    studentId,
                    scholarshipId,
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                ...scholarship,
                applied: !!existingApplication,
                applicationStatus: existingApplication?.status || null,
            },
        });
    } catch (error) {
        console.error('Error fetching scholarship:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch scholarship' },
            { status: 500 }
        );
    }
}