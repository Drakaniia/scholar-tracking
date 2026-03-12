import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { validateStudentScholarshipEligibility } from '@/lib/scholarship-validation';

// GET /api/students/[id]/scholarships - Get all scholarships for a student
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF' && session.role !== 'VIEWER')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { id } = await params;
        const studentId = parseInt(id);

        // Verify that the student exists
        const student = await prisma.student.findUnique({
            where: { id: studentId },
        });

        if (!student) {
            return NextResponse.json(
                { success: false, error: 'Student not found' },
                { status: 404 }
            );
        }

        // Get all scholarships for this student
        const studentScholarships = await prisma.studentScholarship.findMany({
            where: {
                studentId,
            },
            include: {
                scholarship: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return NextResponse.json({
            success: true,
            data: studentScholarships,
        });
    } catch (error) {
        console.error('Error fetching student scholarships:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch student scholarships' },
            { status: 500 }
        );
    }
}

// POST /api/students/[id]/scholarships - Assign a scholarship to a student
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();

        if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF')) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const { id } = await params;
        const studentId = parseInt(id);
        const body = await request.json();

        const { scholarshipId, awardDate, startTerm, endTerm, grantAmount, grantType, scholarshipStatus } = body;

        // Validate required fields
        if (!scholarshipId) {
            return NextResponse.json(
                { success: false, error: 'Scholarship ID is required' },
                { status: 400 }
            );
        }

        // Validate if student exists
        const student = await prisma.student.findUnique({
            where: { id: studentId },
        });

        if (!student) {
            return NextResponse.json(
                { success: false, error: 'Student not found' },
                { status: 404 }
            );
        }

        // Validate if scholarship exists
        const scholarship = await prisma.scholarship.findUnique({
            where: { id: scholarshipId },
        });

        if (!scholarship) {
            return NextResponse.json(
                { success: false, error: 'Scholarship not found' },
                { status: 404 }
            );
        }

        // Validate student-scholarship eligibility
        await validateStudentScholarshipEligibility(studentId, scholarshipId);

        // Determine the actual grant type and amount
        const actualGrantType = grantType || scholarship.grantType || 'FULL';
        const actualGrantAmount = actualGrantType === 'TUITION_ONLY' || actualGrantType === 'NONE' ? 0 : (grantAmount || scholarship.amount);

        // Create the student-scholarship assignment
        const studentScholarship = await prisma.studentScholarship.create({
            data: {
                studentId,
                scholarshipId,
                awardDate: awardDate || new Date(),
                startTerm: startTerm || '',
                endTerm: endTerm || '',
                grantAmount: actualGrantAmount,
                grantType: actualGrantType,
                scholarshipStatus: scholarshipStatus || 'Active',
            },
        });

        // Auto-create student fees based on scholarship fee limits if scholarship has fee coverage
        const shouldCreateFees = scholarship.coversTuition || scholarship.coversMiscellaneous || scholarship.coversLaboratory || scholarship.coversOther;
        
        if (shouldCreateFees) {
            // Get current academic year and term
            const currentYear = new Date().getFullYear();
            const academicYear = `${currentYear}-${currentYear + 1}`;
            const term = '1st Semester'; // Default term, can be customized

            // Calculate total fees from scholarship limits
            const totalFees = 
                Number(scholarship.tuitionFee || 0) +
                Number(scholarship.miscellaneousFee || 0) +
                Number(scholarship.laboratoryFee || 0) +
                Number(scholarship.otherFee || 0);

            // Use scholarship's amountSubsidy or calculate based on grant type
            let amountSubsidy = Number(scholarship.amountSubsidy || 0);
            
            // If no amountSubsidy is set, use the fee limits as the subsidy
            if (amountSubsidy === 0 && totalFees > 0) {
                amountSubsidy = totalFees;
            }

            // Calculate percent subsidy
            const percentSubsidy = totalFees > 0 ? Number((amountSubsidy / totalFees).toFixed(4)) : 0;

            // Create or update student fees using scholarship limits as the actual fees
            await prisma.studentFees.upsert({
                where: {
                    studentId_term_academicYear: {
                        studentId,
                        term,
                        academicYear,
                    },
                },
                update: {
                    tuitionFee: scholarship.tuitionFee || 0,
                    miscellaneousFee: scholarship.miscellaneousFee || 0,
                    laboratoryFee: scholarship.laboratoryFee || 0,
                    otherFee: scholarship.otherFee || 0,
                    amountSubsidy,
                    percentSubsidy,
                },
                create: {
                    studentId,
                    tuitionFee: scholarship.tuitionFee || 0,
                    miscellaneousFee: scholarship.miscellaneousFee || 0,
                    laboratoryFee: scholarship.laboratoryFee || 0,
                    otherFee: scholarship.otherFee || 0,
                    amountSubsidy,
                    percentSubsidy,
                    term,
                    academicYear,
                },
            });
        }

        return NextResponse.json({
            success: true,
            data: studentScholarship,
            message: shouldCreateFees ? 'Scholarship assigned successfully and fees created' : 'Scholarship assigned successfully',
        });
    } catch (error) {
        console.error('Error assigning scholarship to student:', error);
        
        // Handle validation errors specifically
        if (error instanceof Error && error.message.includes('not eligible')) {
            return NextResponse.json(
                { success: false, error: error.message },
                { status: 400 }
            );
        }
        
        return NextResponse.json(
            { success: false, error: 'Failed to assign scholarship to student' },
            { status: 500 }
        );
    }
}