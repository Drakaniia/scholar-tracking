import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateStudentInput } from '@/types';
import { getSession } from '@/lib/auth';
import { getPaginationParams, buildSearchWhere, queryOptimizer, generateQueryKey } from '@/lib/query-optimizer';

// GET /api/students - Get all students
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const gradeLevel = searchParams.get('gradeLevel') || '';

        // Use server-side cache for student queries
        const cacheKey = generateQueryKey('students-list', { page, limit, search, gradeLevel });
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

        const where = buildSearchWhere(
            search,
            ['lastName', 'firstName', 'program'],
            gradeLevel ? { gradeLevel } : undefined
        );

        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
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
                            scholarshipStatus: true,
                            scholarship: {
                                select: {
                                    id: true,
                                    scholarshipName: true,
                                    sponsor: true,
                                    type: true,
                                    source: true,
                                    status: true,
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
                lastName: body.lastName,
                firstName: body.firstName,
                middleInitial: body.middleInitial || null,
                program: body.program,
                gradeLevel: body.gradeLevel,
                yearLevel: body.yearLevel,
                status: body.status,
            },
        });

        // If scholarship is provided, create the relationship
        if (body.scholarshipId) {
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
