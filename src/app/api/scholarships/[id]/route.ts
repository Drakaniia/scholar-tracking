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

        const existingScholarship = await prisma.scholarship.findUnique({
            where: { id: scholarshipId }
        });

        if (!existingScholarship) {
            return NextResponse.json(
                { success: false, error: 'Scholarship not found' },
                { status: 404 }
            );
        }

        const prismaData: Record<string, unknown> = {};
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                // Convert Decimal-compatible fields to numbers
                if (['tuitionFee', 'miscellaneousFee', 'laboratoryFee', 'otherFee', 'amountSubsidy', 'percentSubsidy', 'amount'].includes(field)) {
                    const value = updateData[field];
                    prismaData[field] = value !== null ? Number(value) : 0;
                } else {
                    prismaData[field] = updateData[field]!;
                }
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
            const tuitionFee = Number(updateData.tuitionFee ?? prismaData.tuitionFee ?? 0);
            const miscellaneousFee = Number(updateData.miscellaneousFee ?? prismaData.miscellaneousFee ?? 0);
            const laboratoryFee = Number(updateData.laboratoryFee ?? prismaData.laboratoryFee ?? 0);
            const otherFee = Number(updateData.otherFee ?? prismaData.otherFee ?? 0);
            const amountSubsidy = Number(updateData.amountSubsidy ?? prismaData.amountSubsidy ?? 0);

            const totalFees = tuitionFee + miscellaneousFee + laboratoryFee + otherFee;
            // Calculate percentSubsidy as decimal (e.g., 0.1667 for 16.67%)
            prismaData.percentSubsidy = totalFees > 0 ? Number((amountSubsidy / totalFees).toFixed(4)) : 0;
        }

        let scholarship;
        try {
            scholarship = await prisma.scholarship.update({
                where: { id: scholarshipId },
                data: prismaData,
            });
        } catch (updateError) {
            console.error('Error updating scholarship:', updateError);
            return NextResponse.json(
                { success: false, error: 'Failed to update scholarship', details: updateError instanceof Error ? updateError.message : 'Unknown error' },
                { status: 500 }
            );
        }

        // If amountSubsidy or fee fields were updated, sync with existing student fees.
        // Important: when only `amountSubsidy` changes, we should NOT overwrite existing
        // student fee breakdown amounts (tuition/misc/lab/other), otherwise they can be reset to 0.
        const feeAmountFieldsUpdated =
            (updateData.tuitionFee !== undefined && Number(updateData.tuitionFee) !== Number(existingScholarship.tuitionFee || 0)) ||
            (updateData.miscellaneousFee !== undefined && Number(updateData.miscellaneousFee) !== Number(existingScholarship.miscellaneousFee || 0)) ||
            (updateData.laboratoryFee !== undefined && Number(updateData.laboratoryFee) !== Number(existingScholarship.laboratoryFee || 0)) ||
            (updateData.otherFee !== undefined && Number(updateData.otherFee) !== Number(existingScholarship.otherFee || 0));

        const subsidyFieldsUpdated =
            (updateData.amountSubsidy !== undefined && Number(updateData.amountSubsidy) !== Number(existingScholarship.amountSubsidy || 0)) ||
            feeAmountFieldsUpdated;

        if (subsidyFieldsUpdated) {
            try {
                // Get all students with this scholarship
                const studentScholarships = await prisma.studentScholarship.findMany({
                    where: {
                        scholarshipId,
                        scholarshipStatus: 'Active',
                    },
                    select: {
                        studentId: true,
                    },
                });

                // Update student fees for each student
                const updatedScholarship = await prisma.scholarship.findUnique({
                    where: { id: scholarshipId },
                });

                if (updatedScholarship && studentScholarships.length > 0) {
                    const amountSubsidy = updateData.amountSubsidy !== undefined
                        ? Number(updateData.amountSubsidy)
                        : Number(updatedScholarship.amountSubsidy || 0);

                    // Update fees for all students with this scholarship
                    await Promise.all(
                        studentScholarships.map(async (ss) => {
                            // Get the student's existing fees to find the right term/year
                            const existingFees = await prisma.studentFees.findMany({
                                where: { studentId: ss.studentId },
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                            });

                            if (existingFees.length > 0) {
                                const existingFee = existingFees[0];

                                const totalFeesForPercent =
                                    feeAmountFieldsUpdated
                                        ? (Number(updatedScholarship.tuitionFee || 0) +
                                           Number(updatedScholarship.miscellaneousFee || 0) +
                                           Number(updatedScholarship.laboratoryFee || 0) +
                                           Number(updatedScholarship.otherFee || 0))
                                        : (Number(existingFee.tuitionFee || 0) +
                                           Number(existingFee.miscellaneousFee || 0) +
                                           Number(existingFee.laboratoryFee || 0) +
                                           Number(existingFee.otherFee || 0));

                                // Calculate percentSubsidy as decimal (e.g., 0.1667 for 16.67%)
                                const percentSubsidy = totalFeesForPercent > 0
                                    ? Number((amountSubsidy / totalFeesForPercent).toFixed(4))
                                    : 0;

                                const studentFeeUpdateData: Record<string, unknown> = {
                                    amountSubsidy,
                                    percentSubsidy,
                                };

                                // Only overwrite student fee breakdown amounts when scholarship fee amounts change.
                                if (feeAmountFieldsUpdated) {
                                    studentFeeUpdateData.tuitionFee = Number(updatedScholarship.tuitionFee || 0);
                                    studentFeeUpdateData.miscellaneousFee = Number(updatedScholarship.miscellaneousFee || 0);
                                    studentFeeUpdateData.laboratoryFee = Number(updatedScholarship.laboratoryFee || 0);
                                    studentFeeUpdateData.otherFee = Number(updatedScholarship.otherFee || 0);
                                }

                                // Update existing fee record
                                await prisma.studentFees.update({
                                    where: { id: existingFees[0].id },
                                    data: {
                                        ...studentFeeUpdateData,
                                    },
                                });
                            }
                            // Skip creating new records if student has no fees yet
                        })
                    );
                }
            } catch (syncError) {
                console.error('Error syncing scholarship to student fees:', syncError);
                // Don't fail the entire request, just log the error
            }
        }

        // Invalidate cache
        queryOptimizer.invalidatePattern('scholarships-list');
        queryOptimizer.invalidate('scholarships-counts');
        queryOptimizer.invalidatePattern('students-list');
        queryOptimizer.invalidatePattern('dashboard');

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
