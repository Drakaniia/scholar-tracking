import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserFromRequest, isStudent } from '@/lib/auth';
import { UpdateStudentInput } from '@/types';

// GET /api/web/profile - Get student profile
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUserFromRequest(request);

        if (!user || !isStudent(user) || !user.studentId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const studentId = user.studentId;

        const student = await prisma.student.findUnique({
            where: { id: studentId },
        });

        if (!student) {
            return NextResponse.json(
                { success: false, error: 'Student not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error('Error fetching profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch profile' },
            { status: 500 }
        );
    }
}

// PUT /api/web/profile - Update student profile
export async function PUT(request: NextRequest) {
    try {
        const user = await getCurrentUserFromRequest(request);

        if (!user || !isStudent(user) || !user.studentId) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const studentId = user.studentId;
        const body: UpdateStudentInput = await request.json();

        const student = await prisma.student.update({
            where: { id: studentId },
            data: body,
        });

        return NextResponse.json({
            success: true,
            data: student,
            message: 'Profile updated successfully',
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}