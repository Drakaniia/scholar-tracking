import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateStudentInput } from '@/types';
import { getSession } from '@/lib/auth';
import { getPaginationParams, buildSearchWhere, queryOptimizer, generateQueryKey } from '@/lib/query-optimizer';
import { validateMultipleStudentScholarshipEligibility } from '@/lib/scholarship-validation';

// GET /api/students - Get all students
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const gradeLevel = searchParams.get('gradeLevel') || '';
        const program = searchParams.get('program') || '';
        const status = searchParams.get('status') || '';
        const scholarshipId = searchParams.get('scholarshipId') || '';
        const archivedParam = searchParams.get('archived');
        const includeArchived = archivedParam === 'true';

        // Use server-side cache for student queries
        const cacheKey = generateQueryKey('students-list', { page, limit, search, gradeLevel, program, status, scholarshipId });
        const cachedData = queryOptimizer.get<{ students: unknown[]; total: number }>(cacheKey);
        
        if (cachedData) {
            return NextResponse.json({
                success: true,
                data: cachedData.students,
                total: cachedData.total,
                page,
                limit,
                totalPages: Math.ceil(cachedData.total / limit),
                cached: true,
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                    'CDN-Cache-Control': 'public, s-maxage=60',
                    'X-Cache': 'HIT',
                },
            });
        }

        const { skip, take } = getPaginationParams(page, limit);

        // Build where clause with additional filters
        const additionalFilters: Record<string, unknown> = {};
        if (gradeLevel) additionalFilters.gradeLevel = gradeLevel;
        if (program) additionalFilters.program = program;
        if (status) additionalFilters.status = status;

        const where = buildSearchWhere(
            search,
            ['lastName', 'firstName', 'program'],
            { ...additionalFilters, isArchived: includeArchived ? true : false }
        );

        // Add scholarship filter if specified
        if (scholarshipId) {
            if (scholarshipId === 'none') {
                // Filter students with no scholarships
                Object.assign(where, {
                    scholarships: {
                        none: {},
                    },
                });
            } else {
                // Filter students with specific scholarship
                Object.assign(where, {
                    scholarships: {
                        some: {
                            scholarshipId: parseInt(scholarshipId),
                        },
                    },
                });
            }
        }

        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where,
                skip,
                take,
                orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
                select: {
                    id: true,
                    lastName: true,
                    firstName: true,
                    middleInitial: true,
                    program: true,
                    gradeLevel: true,
                    yearLevel: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    scholarships: {
                        select: {
                            id: true,
                            scholarshipId: true,
                            awardDate: true,
                            startTerm: true,
                            endTerm: true,
                            grantAmount: true,
                            grantType: true,
                            scholarshipStatus: true,
                            scholarship: {
                                select: {
                                    id: true,
                                    scholarshipName: true,
                                    sponsor: true,
                                    type: true,
                                    source: true,
                                    status: true,
                                    grantType: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma.student.count({ where }),
        ]);

        // Cache for 90 seconds
        queryOptimizer.set(cacheKey, { students, total }, 90 * 1000);

        return NextResponse.json({
            success: true,
            data: students,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            cached: false,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                'CDN-Cache-Control': 'public, s-maxage=60',
                'X-Cache': 'MISS',
            },
        });
    } catch (error) {
        console.error('Error fetching students:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch students' },
            { status: 500 }
        );
    }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body: CreateStudentInput = await request.json();

        const student = await prisma.student.create({
            data: {
                lastName: body.lastName.toUpperCase(),
                firstName: body.firstName.toUpperCase(),
                middleInitial: body.middleInitial ? body.middleInitial.toUpperCase() : null,
                program: body.program,
                gradeLevel: body.gradeLevel,
                yearLevel: body.yearLevel,
                status: body.status,
                birthDate: body.birthDate || null,
            },
        });

        // Handle multiple scholarships if provided
        if (body.scholarships && body.scholarships.length > 0) {
            // Validate scholarship assignments before creating them
            const scholarshipIds = body.scholarships.map(s => s.scholarshipId);
            await validateMultipleStudentScholarshipEligibility(student.id, scholarshipIds);

            await prisma.studentScholarship.createMany({
                data: body.scholarships.map(scholarship => ({
                    studentId: student.id,
                    scholarshipId: scholarship.scholarshipId,
                    awardDate: scholarship.awardDate || new Date(),
                    startTerm: scholarship.startTerm || '',
                    endTerm: scholarship.endTerm || '',
                    grantAmount: scholarship.grantAmount || 0,
                    grantType: scholarship.grantType || 'FULL',
                    scholarshipStatus: scholarship.scholarshipStatus || 'Active',
                })),
            });

            // Auto-create StudentFees from scholarships
            await createStudentFeesFromScholarships(student.id, body.scholarships.map(s => s.scholarshipId));
        }
        // Fallback to single scholarship for backward compatibility
        else if (body.scholarshipId) {
            // Validate scholarship assignment before creating it
            await validateMultipleStudentScholarshipEligibility(student.id, [body.scholarshipId]);

            await prisma.studentScholarship.create({
                data: {
                    studentId: student.id,
                    scholarshipId: body.scholarshipId,
                    awardDate: body.awardDate || new Date(),
                    startTerm: body.startTerm || '',
                    endTerm: body.endTerm || '',
                    grantAmount: body.grantAmount || 0,
                    scholarshipStatus: body.scholarshipStatus || 'Active',
                },
            });

            // Auto-create StudentFees from scholarship
            await createStudentFeesFromScholarships(student.id, [body.scholarshipId]);
        }

        return NextResponse.json({
            success: true,
            data: student,
            message: 'Student created successfully',
        });
    } catch (error) {
        console.error('Error creating student:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to create student' },
            { status: 500 }
        );
    }
}

/**
 * Helper function to create StudentFees from assigned scholarships
 * Copies fee structure from scholarship to student's fee record
 */
async function createStudentFeesFromScholarships(studentId: number, scholarshipIds: number[]) {
    // Get current academic year
    const currentAcademicYear = await prisma.academicYear.findFirst({
        where: { isActive: true },
    });

    const term = currentAcademicYear?.semester === '1ST' ? '1st Semester' : 
                 currentAcademicYear?.semester === '2ND' ? '2nd Semester' : 'Summer';
    
    const academicYear = currentAcademicYear?.year || new Date().getFullYear().toString();
    const academicYearId = currentAcademicYear?.id || null;

    // Get all scholarships with their fee structures
    const scholarships = await prisma.scholarship.findMany({
        where: { id: { in: scholarshipIds } },
    });

    // Calculate total fees from all scholarships
    let totalTuitionFee = 0;
    let totalMiscellaneousFee = 0;
    let totalLaboratoryFee = 0;
    let totalOtherFee = 0;
    let totalAmountSubsidy = 0;

    for (const scholarship of scholarships) {
        totalTuitionFee += Number(scholarship.tuitionFee) || 0;
        totalMiscellaneousFee += Number(scholarship.miscellaneousFee) || 0;
        totalLaboratoryFee += Number(scholarship.laboratoryFee) || 0;
        totalOtherFee += Number(scholarship.otherFee) || 0;
        totalAmountSubsidy += Number(scholarship.amountSubsidy) || 0;
    }

    // Calculate percent subsidy (as decimal, e.g., 0.1667 for 16.67%)
    const totalFees = totalTuitionFee + totalMiscellaneousFee + totalLaboratoryFee + totalOtherFee;
    const percentSubsidy = totalFees > 0 ? Number((totalAmountSubsidy / totalFees).toFixed(4)) : 0;

    // Check if fees already exist for this term
    const existingFees = await prisma.studentFees.findFirst({
        where: {
            studentId,
            term: `${term} ${academicYear}`,
            academicYear,
        },
    });

    if (existingFees) {
        // Update existing fees by adding to current values
        await prisma.studentFees.update({
            where: { id: existingFees.id },
            data: {
                tuitionFee: Number(existingFees.tuitionFee) + totalTuitionFee,
                miscellaneousFee: Number(existingFees.miscellaneousFee) + totalMiscellaneousFee,
                laboratoryFee: Number(existingFees.laboratoryFee) + totalLaboratoryFee,
                otherFee: Number(existingFees.otherFee) + totalOtherFee,
                amountSubsidy: Number(existingFees.amountSubsidy) + totalAmountSubsidy,
                percentSubsidy,
                academicYearId,
            },
        });
    } else {
        // Create new fees
        await prisma.studentFees.create({
            data: {
                studentId,
                tuitionFee: totalTuitionFee,
                miscellaneousFee: totalMiscellaneousFee,
                laboratoryFee: totalLaboratoryFee,
                otherFee: totalOtherFee,
                amountSubsidy: totalAmountSubsidy,
                percentSubsidy,
                term: `${term} ${academicYear}`,
                academicYear,
                academicYearId,
            },
        });
    }
}
