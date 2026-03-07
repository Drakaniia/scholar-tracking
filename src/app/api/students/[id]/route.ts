import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { UpdateStudentInput } from '@/types';
import { getSession } from '@/lib/auth';
import { validateMultipleStudentScholarshipEligibility } from '@/lib/scholarship-validation';
import { hasStudentGraduated } from '@/lib/graduation-service';

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
        const body: UpdateStudentInput = await request.json();

        // Extract scholarships from body
        const { scholarships } = body;
        
        // Use a transaction to update student and scholarships
        const result = await prisma.$transaction(async (tx) => {
            // Get the current student data to check for graduation
            const currentStudent = await tx.student.findUnique({
                where: { id: studentId },
            });

            if (!currentStudent) {
                throw new Error(`Student with ID ${studentId} not found`);
            }

            // Update student basic info
            const student = await tx.student.update({
                where: { id: studentId },
                data: {
                    lastName: body.lastName?.toUpperCase(),
                    firstName: body.firstName?.toUpperCase(),
                    middleInitial: body.middleInitial ? body.middleInitial.toUpperCase() : null,
                    program: body.program,
                    gradeLevel: body.gradeLevel,
                    yearLevel: body.yearLevel,
                    status: body.status,
                    birthDate: body.birthDate || null,
                },
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

            // Handle scholarships if provided
            if (scholarships && Array.isArray(scholarships)) {
                // Validate scholarship assignments before creating them
                const scholarshipIds = scholarships.map(s => s.scholarshipId);
                await validateMultipleStudentScholarshipEligibility(studentId, scholarshipIds);
                
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
                            awardDate: scholarship.awardDate,
                            startTerm: scholarship.startTerm,
                            endTerm: scholarship.endTerm,
                            grantAmount: scholarship.grantAmount,
                            scholarshipStatus: scholarship.scholarshipStatus,
                        })),
                    });
                }
            }

            return student;
        });

        return NextResponse.json({
            success: true,
            data: result,
            message: 'Student updated successfully',
        });
    } catch (error) {
        console.error('Error updating student:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to update student' },
            { status: 500 }
        );
    }
}

// PATCH /api/students/[id]/archive - Archive student
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
        const studentId = parseInt(id);
        const body = await request.json();
        action = body.action; // 'archive' or 'unarchive'

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
