import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UpdateScholarshipInput } from '@/types';
import { getSession } from '@/lib/auth';

// GET /api/scholarships/[id] - Get single scholarship
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const scholarshipId = parseInt(id);

        const scholarship = await prisma.scholarship.findUnique({
            where: { id: scholarshipId },
            select: {
                id: true,
                scholarshipName: true,
                sponsor: true,
                type: true,
                source: true,
                eligibleGradeLevels: true,
                amount: true,
                requirements: true,
                status: true,
                startDate: true,
                endDate: true,
                createdAt: true,
                updatedAt: true,
                students: {
                    include: {
                        student: {
                            select: {
                                id: true,
                                lastName: true,
                                firstName: true,
                                middleInitial: true,
                                gradeLevel: true,
                                yearLevel: true,
                                program: true,
                                status: true,
                            },
                        },
                    },
                },
                disbursements: {
                    include: {
                        student: {
                            select: {
                                lastName: true,
                                firstName: true,
                            },
                        },
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

// PUT /api/scholarships/[id] - Update scholarship
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
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

// PATCH /api/scholarships/[id]/archive - Archive scholarship
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    let action = 'unknown'; // Initialize with a default value
    try {
        const session = await getSession();
        
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { id } = await params;
        const scholarshipId = parseInt(id);
        const body = await request.json();
        action = body.action; // 'archive' or 'unarchive'

        if (action !== 'archive' && action !== 'unarchive') {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Use "archive" or "unarchive".' },
                { status: 400 }
            );
        }

        const updatedScholarship = await prisma.scholarship.update({
            where: { id: scholarshipId },
            data: { isArchived: action === 'archive' },
        });

        return NextResponse.json({
            success: true,
            data: updatedScholarship,
            message: `Scholarship ${action}d successfully`,
        });
    } catch (error) {
        console.error(`Error ${action === 'archive' ? 'archiving' : 'unarchiving'} scholarship:`, error);
        return NextResponse.json(
            { success: false, error: `Failed to ${action} scholarship` },
            { status: 500 }
        );
    }
}
