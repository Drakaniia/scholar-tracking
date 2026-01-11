import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserFromRequest, isStudent } from '@/lib/auth';

// GET /api/web/applications - Get student's applications
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user || !isStudent(user) || !user.studentId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const studentId = user.studentId;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const where = {
      studentId,
      ...(status ? { status } : {}),
    };

    const [applications, total] = await Promise.all([
      prisma.studentScholarship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
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

// POST /api/web/applications - Apply for a scholarship
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user || !isStudent(user) || !user.studentId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const studentId = user.studentId;
    const { scholarshipId, remarks } = await request.json();

    if (!scholarshipId) {
      return NextResponse.json(
        { success: false, error: 'Scholarship ID is required' },
        { status: 400 }
      );
    }

    // Check if scholarship exists and is active
    const scholarship = await prisma.scholarship.findUnique({
      where: { id: parseInt(scholarshipId) },
    });

    if (!scholarship) {
      return NextResponse.json(
        { success: false, error: 'Scholarship not found' },
        { status: 404 }
      );
    }

    if (!scholarship.isActive) {
      return NextResponse.json(
        { success: false, error: 'Scholarship is not available' },
        { status: 400 }
      );
    }

    // Check if already applied
    const existingApplication = await prisma.studentScholarship.findUnique({
      where: {
        studentId_scholarshipId: {
          studentId,
          scholarshipId: parseInt(scholarshipId),
        },
      },
    });

    if (existingApplication) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have already applied for this scholarship',
        },
        { status: 400 }
      );
    }

    const application = await prisma.studentScholarship.create({
      data: {
        studentId,
        scholarshipId: parseInt(scholarshipId),
        status: 'Pending',
        remarks: remarks || null,
      },
      include: {
        scholarship: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: application,
      message: 'Application submitted successfully',
    });
  } catch (error) {
    console.error('Error creating application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to submit application' },
      { status: 500 }
    );
  }
}
