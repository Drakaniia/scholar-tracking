import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UpdateScholarshipInput } from '@/types';
import { getCurrentUserFromRequest, hasRole } from '@/lib/auth';

// GET /api/admin/scholarships/[id] - Get single scholarship (admin/staff only)
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUserFromRequest(request);

        if (!user || !hasRole(user, ['admin', 'staff'])) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const scholarshipId = parseInt(id);

        const scholarship = await prisma.scholarship.findUnique({
            where: { id: scholarshipId },
            include: {
                students: {
                    include: {
                        student: true,
                    },
                },
            },
        });

        if (!scholarship) {
            return NextResponse.json(
                { success: false, error: 'Scholarship not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: scholarship,
        });
    } catch (error) {
        console.error('Error fetching scholarship:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch scholarship' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/scholarships/[id] - Update scholarship (admin/staff only)
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUserFromRequest(request);

        if (!user || !hasRole(user, ['admin', 'staff'])) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const scholarshipId = parseInt(id);
        const body: UpdateScholarshipInput = await request.json();

        const scholarship = await prisma.scholarship.update({
            where: { id: scholarshipId },
            data: body,
        });

        return NextResponse.json({
            success: true,
            data: scholarship,
            message: 'Scholarship updated successfully',
        });
    } catch (error) {
        console.error('Error updating scholarship:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update scholarship' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/scholarships/[id] - Delete scholarship (admin/staff only)
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUserFromRequest(request);

        if (!user || !hasRole(user, ['admin', 'staff'])) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const scholarshipId = parseInt(id);

        await prisma.scholarship.delete({
            where: { id: scholarshipId },
        });

        return NextResponse.json({
            success: true,
            message: 'Scholarship deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting scholarship:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete scholarship' },
            { status: 500 }
        );
    }
}