import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateApplicationInput } from '@/types';

// GET /api/applications - Get all applications
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const studentId = searchParams.get('studentId') || '';
    const scholarshipId = searchParams.get('scholarshipId') || '';

    const skip = (page - 1) * limit;

    const where = {
      AND: [
        status ? { status } : {},
        studentId ? { studentId: parseInt(studentId) } : {},
        scholarshipId ? { scholarshipId: parseInt(scholarshipId) } : {},
      ],
    };

    const [applications, total] = await Promise.all([
      prisma.studentScholarship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          student: true,
          scholarship: true,
        },
      }),
      prisma.studentScholarship.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: applications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}

// POST /api/applications - Create a new application (assign scholarship to student)
export async function POST(request: NextRequest) {
  try {
    const body: CreateApplicationInput = await request.json();

    // Check if the combination already exists
    const existing = await prisma.studentScholarship.findUnique({
      where: {
        studentId_scholarshipId: {
          studentId: body.studentId,
          scholarshipId: body.scholarshipId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Student already has this scholarship' },
        { status: 400 }
      );
    }

    const application = await prisma.studentScholarship.create({
      data: {
        studentId: body.studentId,
        scholarshipId: body.scholarshipId,
        remarks: body.remarks || null,
      },
      include: {
        student: true,
        scholarship: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: application,
      message: 'Scholarship assigned to student successfully',
    });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign scholarship' },
      { status: 500 }
    );
  }
}
