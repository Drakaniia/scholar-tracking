import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UpdateApplicationInput } from '@/types';
import { getCurrentUserFromRequest, hasRole } from '@/lib/auth';

// GET /api/admin/applications/[id] - Get single application (admin/staff only)
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
        const applicationId = parseInt(id);

        const application = await prisma.studentScholarship.findUnique({
            where: { id: applicationId },
            include: {
                student: true,
                scholarship: true,
            },
        });

        if (!application) {
            return NextResponse.json(
                { success: false, error: 'Application not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            data: application,
        });
    } catch (error) {
        console.error('Error fetching application:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch application' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/applications/[id] - Update application status (admin/staff only)
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
        const applicationId = parseInt(id);
        const body: UpdateApplicationInput = await request.json();

        const updateData: Record<string, unknown> = {};
        if (body.status) {
            updateData.status = body.status;
            if (body.status === 'Approved') {
                updateData.dateApproved = new Date();
            }
        }
        if (body.remarks !== undefined) {
            updateData.remarks = body.remarks;
        }

        const application = await prisma.studentScholarship.update({
            where: { id: applicationId },
            data: updateData,
            include: {
                student: true,
                scholarship: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: application,
            message: 'Application updated successfully',
        });
    } catch (error) {
        console.error('Error updating application:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update application' },
            { status: 500 }
        );
    }
}

// DELETE /api/admin/applications/[id] - Delete application (admin/staff only)
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
        const applicationId = parseInt(id);

        await prisma.studentScholarship.delete({
            where: { id: applicationId },
        });

        return NextResponse.json({
            success: true,
            message: 'Application deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting application:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to delete application' },
            { status: 500 }
        );
    }
}