import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateStudentInput } from '@/types';
import { getSession } from '@/lib/auth';
import { getPaginationParams, buildSearchWhere } from '@/lib/query-optimizer';

// GET /api/students - Get all students
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const gradeLevel = searchParams.get('gradeLevel') || '';

        const { skip, take } = getPaginationParams(page, limit);

        const where = buildSearchWhere(
            search,
            ['lastName', 'firstName', 'studentNo', 'program'],
            gradeLevel ? { gradeLevel } : undefined
        );

        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                include: {
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
            }),
            prisma.student.count({ where }),
        ]);

        return NextResponse.json({
            success: true,
            data: students,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
                'CDN-Cache-Control': 'public, s-maxage=30',
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
                studentNo: body.studentNo,
                lastName: body.lastName,
                firstName: body.firstName,
                middleInitial: body.middleInitial || null,
                program: body.program,
                gradeLevel: body.gradeLevel,
                yearLevel: body.yearLevel,
                status: body.status,
                scholarshipId: body.scholarshipId || null,
                awardDate: body.awardDate || null,
                startTerm: body.startTerm || null,
                endTerm: body.endTerm || null,
                grantAmount: body.grantAmount || null,
                scholarshipStatus: body.scholarshipStatus || null,
            },
        });

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
