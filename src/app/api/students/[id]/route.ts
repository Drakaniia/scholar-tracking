import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { UpdateStudentInput } from '@/types';
import { getSession } from '@/lib/auth';
import { validateMultipleStudentScholarshipEligibility } from '@/lib/scholarship-validation';
import { hasStudentGraduated } from '@/lib/graduation-service';
import { queryOptimizer } from '@/lib/query-optimizer';

// GET /api/students/[id] - Get single student
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const studentId = parseInt(id);

        const student = await prisma.student.findUnique({
            where: { id: studentId },
            include: {
                scholarships: {
                    include: {
                        scholarship: true,
                    },
                },
                fees: true,
                disbursements: {
                    include: {
                        scholarship: true,
                    },
                },
            },
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
        console.error('Error fetching student:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch student' },
            { status: 500 }
        );
    }
}

// PUT /api/students/[id] - Update student
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
        const studentId = parseInt(id);
        
        if (isNaN(studentId)) {
            return NextResponse.json(
                { success: false, error: 'Invalid student ID' },
                { status: 400 }
            );
        }

        let body: UpdateStudentInput;
        try {
            body = await request.json();
        } catch (parseError) {
            console.error('Error parsing request body:', parseError);
            return NextResponse.json(
                { success: false, error: 'Invalid request body' },
                { status: 400 }
            );
        }

        // Extract scholarships from body
        const { scholarships } = body;

        // Validate scholarships array if provided
        if (scholarships !== undefined && !Array.isArray(scholarships)) {
            return NextResponse.json(
                { success: false, error: 'Scholarships must be an array' },
                { status: 400 }
            );
        }

        // Use a transaction to update student and scholarships
        const result = await prisma.$transaction(async (tx) => {
            let removedScholarships: Array<{ id: number; name: string }> = [];
            // Get the current student data to check for graduation
            const currentStudent = await tx.student.findUnique({
                where: { id: studentId },
            });

            if (!currentStudent) {
                throw new Error(`Student with ID ${studentId} not found`);
            }

            // Build update data object
            const updateData: Record<string, unknown> = {};
            if (body.lastName !== undefined) updateData.lastName = body.lastName.toUpperCase();
            if (body.firstName !== undefined) updateData.firstName = body.firstName.toUpperCase();
            if (body.middleInitial !== undefined) updateData.middleInitial = body.middleInitial ? body.middleInitial.toUpperCase() : null;
            if (body.program !== undefined) updateData.program = body.program;
            if (body.gradeLevel !== undefined) updateData.gradeLevel = body.gradeLevel;
            if (body.yearLevel !== undefined) updateData.yearLevel = body.yearLevel;
            if (body.status !== undefined) updateData.status = body.status;
            if (body.birthDate !== undefined) updateData.birthDate = body.birthDate || null;

            // Update student basic info
            const student = await tx.student.update({
                where: { id: studentId },
                data: updateData,
            });

            // Check if the student has graduated after the update
            const updatedStudent = {
                ...currentStudent,
                gradeLevel: body.gradeLevel || currentStudent.gradeLevel,
                yearLevel: body.yearLevel || currentStudent.yearLevel,
            };
            if (hasStudentGraduated(updatedStudent as { gradeLevel: string; yearLevel: string })) {
                // Update graduation status - using direct Prisma query
                await tx.student.update({
                    where: { id: studentId },
                    data: {
                        graduationStatus: 'Graduated',
                        graduatedAt: new Date(),
                    },
                });

                // Remove active scholarships for graduated student
                await tx.studentScholarship.deleteMany({
                    where: {
                        studentId,
                        scholarshipStatus: 'Active',
                    },
                });
            }

            // Check if grade level changed and validate/remove ineligible scholarships
            if (body.gradeLevel !== undefined && body.gradeLevel !== currentStudent.gradeLevel) {
                // Get all current scholarships for the student
                const currentScholarships = await tx.studentScholarship.findMany({
                    where: { studentId },
                    include: {
                        scholarship: true,
                    },
                });

                // Filter scholarships that are still eligible with the new grade level
                const { filterEligibleScholarships } = await import('@/lib/scholarship-validation');
                const eligibleScholarshipIds = filterEligibleScholarships(
                    {
                        gradeLevel: body.gradeLevel,
                        program: currentStudent.program,
                    },
                    currentScholarships.map(ss => ({
                        id: ss.scholarshipId,
                        eligibleGradeLevels: ss.scholarship.eligibleGradeLevels,
                        eligiblePrograms: ss.scholarship.eligiblePrograms,
                    }))
                );

                // Find scholarships that are no longer eligible
                const ineligibleScholarships = currentScholarships.filter(
                    ss => !eligibleScholarshipIds.includes(ss.scholarshipId)
                );

                // Track removed scholarships for the response
                removedScholarships = ineligibleScholarships.map(ss => ({
                    id: ss.scholarshipId,
                    name: ss.scholarship.scholarshipName,
                }));

                // Remove ineligible scholarships
                if (ineligibleScholarships.length > 0) {
                    await tx.studentScholarship.deleteMany({
                        where: {
                            studentId,
                            scholarshipId: { in: ineligibleScholarships.map(ss => ss.scholarshipId) },
                        },
                    });
                }
            }

            // Handle scholarships if provided
            if (scholarships !== undefined && Array.isArray(scholarships)) {
                // Validate scholarship assignments before creating them
                const scholarshipIds = scholarships.map(s => s.scholarshipId);
                try {
                    await validateMultipleStudentScholarshipEligibility(studentId, scholarshipIds);
                } catch (validationError) {
                    if (validationError instanceof Error) {
                        throw new Error(`Scholarship validation failed: ${validationError.message}`);
                    }
                    throw validationError;
                }

                // Delete existing scholarships for this student
                await tx.studentScholarship.deleteMany({
                    where: { studentId },
                });

                // Create new scholarships
                if (scholarships.length > 0) {
                    await tx.studentScholarship.createMany({
                        data: scholarships.map((scholarship) => ({
                            studentId,
                            scholarshipId: scholarship.scholarshipId,
                            awardDate: scholarship.awardDate || new Date(),
                            startTerm: scholarship.startTerm || '',
                            endTerm: scholarship.endTerm || '',
                            grantAmount: scholarship.grantAmount || 0,
                            scholarshipStatus: scholarship.scholarshipStatus || 'Active',
                        })),
                    });
                }
            }

            // Update StudentFees if provided
            if (body.fees) {
                await updateStudentFees(tx, studentId, body.fees);
            }

            return { student, removedScholarships };
        });

        // Invalidate cache
        queryOptimizer.invalidatePattern('students-list');

        // Build response with scholarship removal information
        const responseData: {
            success: boolean;
            data: unknown;
            message: string;
            warning?: string;
            removedScholarships?: Array<{ id: number; name: string }>;
        } = {
            success: true,
            data: result.student,
            message: 'Student updated successfully',
        };

        if (result.removedScholarships.length > 0) {
            responseData.warning = `${result.removedScholarships.length} scholarship(s) were automatically removed due to grade level change: ${result.removedScholarships.map((s: { name: string }) => s.name).join(', ')}`;
            responseData.removedScholarships = result.removedScholarships;
        }

        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Error updating student:', error);
        
        // Handle specific error types
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 404 }
                );
            }
            if (error.message.includes('Scholarship validation failed')) {
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 400 }
                );
            }
            if (error.message.includes('Prisma')) {
                return NextResponse.json(
                    { success: false, error: 'Database error occurred' },
                    { status: 500 }
                );
            }
        }
        
        return NextResponse.json(
            { success: false, error: 'Failed to update student' },
            { status: 500 }
        );
    }
}

// PATCH /api/students/[id] - Archive/unarchive student or other actions
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
        const studentId = parseInt(id);
        
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

        const updatedStudent = await prisma.student.update({
            where: { id: studentId },
            data: { isArchived: action === 'archive' },
        });

        // Invalidate cache
        queryOptimizer.invalidatePattern('students-list');

        return NextResponse.json({
            success: true,
            data: updatedStudent,
            message: `Student ${action}d successfully`,
        });
    } catch (error) {
        console.error(`Error ${action === 'archive' ? 'archiving' : 'unarchiving'} student:`, error);
        return NextResponse.json(
            { success: false, error: `Failed to ${action} student` },
            { status: 500 }
        );
    }
}

/**
 * Helper function to update student fees with manual values
 */
async function updateStudentFees(
    tx: Prisma.TransactionClient,
    studentId: number,
    feeData: {
        tuitionFee?: number;
        otherFee?: number;
        miscellaneousFee?: number;
        laboratoryFee?: number;
    }
) {
    // First, check if the student already has any fee records
    const existingFees = await tx.studentFees.findFirst({
        where: { studentId },
        orderBy: { academicYear: 'desc' },
    });

    // Get current academic year
    const currentAcademicYear = await tx.academicYear.findFirst({
        where: { isActive: true },
    });

    const term = currentAcademicYear?.semester === '1ST' ? '1st Semester' :
                 currentAcademicYear?.semester === '2ND' ? '2nd Semester' : 'Summer';

    const academicYear = currentAcademicYear?.year || new Date().getFullYear().toString();
    const academicYearId = currentAcademicYear?.id || null;

    // Calculate total fees
    // Use existing fee values when the request only provides partial fee updates.
    // Using `|| 0` here would incorrectly force totals to 0 and then clamp `amountSubsidy` to 0.
    const resolvedTuitionFee = feeData.tuitionFee ?? (existingFees ? Number(existingFees.tuitionFee) : 0);
    const resolvedOtherFee = feeData.otherFee ?? (existingFees ? Number(existingFees.otherFee) : 0);
    const resolvedMiscellaneousFee = feeData.miscellaneousFee ?? (existingFees ? Number(existingFees.miscellaneousFee) : 0);
    const resolvedLaboratoryFee = feeData.laboratoryFee ?? (existingFees ? Number(existingFees.laboratoryFee) : 0);

    const totalFees =
        resolvedTuitionFee +
        resolvedOtherFee +
        resolvedMiscellaneousFee +
        resolvedLaboratoryFee;

    // Calculate subsidies based on scholarships
    const studentScholarships = await tx.studentScholarship.findMany({
        where: { studentId },
        include: { scholarship: true },
    });

    let totalAmountSubsidy = 0;
    for (const ss of studentScholarships) {
        totalAmountSubsidy += Number(ss.scholarship.amountSubsidy) || 0;
    }

    // Calculate percent subsidy (as percentage, e.g., 16.67 for 16.67%)
    const amountSubsidy = Math.min(totalAmountSubsidy, totalFees);
    const percentSubsidy = totalFees > 0 ? Number(((amountSubsidy / totalFees) * 100).toFixed(2)) : 0;

    if (existingFees) {
        // Update existing fees - use the existing term and academicYear to ensure we update the same record
        await tx.studentFees.update({
            where: { id: existingFees.id },
            data: {
                tuitionFee: feeData.tuitionFee ?? Number(existingFees.tuitionFee),
                otherFee: feeData.otherFee ?? Number(existingFees.otherFee),
                miscellaneousFee: feeData.miscellaneousFee ?? Number(existingFees.miscellaneousFee),
                laboratoryFee: feeData.laboratoryFee ?? Number(existingFees.laboratoryFee),
                amountSubsidy,
                percentSubsidy,
                academicYearId,
            },
        });
    } else {
        // Create new fees
        await tx.studentFees.create({
            data: {
                studentId,
                tuitionFee: resolvedTuitionFee,
                otherFee: resolvedOtherFee,
                miscellaneousFee: resolvedMiscellaneousFee,
                laboratoryFee: resolvedLaboratoryFee,
                amountSubsidy,
                percentSubsidy,
                term: `${term} ${academicYear}`,
                academicYear,
                academicYearId,
            },
        });
    }
}
