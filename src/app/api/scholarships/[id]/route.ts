import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UpdateScholarshipInput } from '@/types';
import { getSession } from '@/lib/auth';
import { queryOptimizer } from '@/lib/query-optimizer';

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
                eligiblePrograms: true,
                amount: true,
                amountSubsidy: true,
                percentSubsidy: true,
                requirements: true,
                status: true,
                isArchived: true,
                grantType: true,
                coversTuition: true,
                coversMiscellaneous: true,
                coversLaboratory: true,
                coversOther: true,
                otherFeeName: true,
                tuitionFee: true,
                miscellaneousFee: true,
                laboratoryFee: true,
                otherFee: true,
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
                                fees: {
                                    select: {
                                        percentSubsidy: true,
                                        amountSubsidy: true,
                                    },
                                },
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
        
        // Parse request body
        const body = await request.json();
        
        // Validate action if provided (for backward compatibility)
        if (body.action && body.action !== 'update') {
            return NextResponse.json(
                { success: false, error: 'Invalid action. Use "update" or omit for direct update.' },
                { status: 400 }
            );
        }

        const updateData: UpdateScholarshipInput = body.data || body;

        // Build update data object with only allowed fields
        const allowedFields: (keyof UpdateScholarshipInput)[] = [
            'scholarshipName', 'sponsor', 'type', 'source',
            'eligibleGradeLevels', 'eligiblePrograms', 'amount',
            'requirements', 'status', 'grantType',
            'coversTuition', 'coversMiscellaneous', 'coversLaboratory', 'coversOther',
            'otherFeeName', 'tuitionFee', 'miscellaneousFee', 'laboratoryFee', 'otherFee',
            'amountSubsidy', 'percentSubsidy'
        ];

        const prismaData: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                prismaData[field] = updateData[field]!;
            }
        }

        // Calculate percentSubsidy if amountSubsidy or fee fields are being updated
        // Skip if percentSubsidy is explicitly provided
        if (updateData.percentSubsidy === undefined && 
            (updateData.amountSubsidy !== undefined ||
            updateData.tuitionFee !== undefined ||
            updateData.miscellaneousFee !== undefined ||
            updateData.laboratoryFee !== undefined ||
            updateData.otherFee !== undefined)) {
            const tuitionFee = updateData.tuitionFee ?? prismaData.tuitionFee as number ?? 0;
            const miscellaneousFee = updateData.miscellaneousFee ?? prismaData.miscellaneousFee as number ?? 0;
            const laboratoryFee = updateData.laboratoryFee ?? prismaData.laboratoryFee as number ?? 0;
            const otherFee = updateData.otherFee ?? prismaData.otherFee as number ?? 0;
            const amountSubsidy = updateData.amountSubsidy ?? prismaData.amountSubsidy as number ?? 0;

            const totalFees = tuitionFee + miscellaneousFee + laboratoryFee + otherFee;
            prismaData.percentSubsidy = totalFees > 0 ? (amountSubsidy / totalFees) * 100 : 0;
        }

        const scholarship = await prisma.scholarship.update({
            where: { id: scholarshipId },
            data: prismaData,
        });

        // Invalidate cache
        queryOptimizer.invalidatePattern('scholarships-list');
        queryOptimizer.invalidate('scholarships-counts');

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

// PATCH /api/scholarships/[id] - Archive/unarchive scholarship or other actions
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    let action = 'unknown';
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
        
        // Parse request body
        const body = await request.json();
        action = body.action;

        if (!action) {
            return NextResponse.json(
                { success: false, error: 'Action is required' },
                { status: 400 }
            );
        }

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

        // Invalidate cache
        queryOptimizer.invalidatePattern('scholarships-list');
        queryOptimizer.invalidate('scholarships-counts');

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
