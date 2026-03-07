import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// DELETE /api/students/[id]/scholarships/[scholarshipId] - Remove a scholarship from a student
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; scholarshipId: string }> }
) {
    try {
        const session = await getSession();

        if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { id, scholarshipId } = await params;
        const studentId = parseInt(id);
        const schId = parseInt(scholarshipId);

        // Verify that the student-scholarship relationship exists
        const studentScholarship = await prisma.studentScholarship.findFirst({
            where: {
                studentId,
                scholarshipId: schId,
            },
        });

        if (!studentScholarship) {
            return NextResponse.json(
                { success: false, error: 'Student-scholarship relationship not found' },
                { status: 404 }
            );
        }

        // Delete the student-scholarship assignment
        await prisma.studentScholarship.delete({
            where: {
                id: studentScholarship.id,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Scholarship removed successfully',
        });
    } catch (error) {
        console.error('Error removing scholarship from student:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to remove scholarship from student' },
            { status: 500 }
        );
    }
}