import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateStudentInput } from '@/types';

// GET /api/students - Get all students
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const yearLevel = searchParams.get('yearLevel') || '';

        const skip = (page - 1) * limit;

        const where = {
            AND: [
                search
                    ? {
                        OR: [
                            { fullName: { contains: search, mode: 'insensitive' as const } },
                            { studentNo: { contains: search, mode: 'insensitive' as const } },
                            { program: { contains: search, mode: 'insensitive' as const } },
                        ],
                    }
                    : {},
                yearLevel ? { yearLevel } : {},
            ],
        };

        const [students, total] = await Promise.all([
            prisma.student.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    applications: {
                        include: {
                            scholarship: true,
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
        const body: CreateStudentInput = await request.json();

        const student = await prisma.student.create({
            data: {
                studentNo: body.studentNo,
                fullName: body.fullName,
                program: body.program,
                yearLevel: body.yearLevel,
                email: body.email,
                status: body.status,
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
