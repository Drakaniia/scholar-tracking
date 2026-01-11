import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateStudentInput } from '@/types';
import { getCurrentUserFromRequest, hasRole } from '@/lib/auth';

// GET /api/admin/students - Get all students (admin/staff only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user || !hasRole(user, ['admin', 'staff'])) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const educationLevel = searchParams.get('educationLevel') || '';

    const skip = (page - 1) * limit;

    const where = {
      AND: [
        search
          ? {
              OR: [
                {
                  firstName: { contains: search, mode: 'insensitive' as const },
                },
                {
                  lastName: { contains: search, mode: 'insensitive' as const },
                },
                { course: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {},
        educationLevel ? { educationLevel } : {},
      ],
    };

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          scholarships: {
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

// POST /api/admin/students - Create a new student (admin/staff only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user || !hasRole(user, ['admin', 'staff'])) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateStudentInput = await request.json();

    const student = await prisma.student.create({
      data: {
        firstName: body.firstName,
        middleName: body.middleName || null,
        lastName: body.lastName,
        yearLevel: body.yearLevel,
        course: body.course,
        tuitionFee: body.tuitionFee,
        educationLevel: body.educationLevel,
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
