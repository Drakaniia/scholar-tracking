import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserFromRequest, isStudent } from '@/lib/auth';

// GET /api/web/dashboard - Get student dashboard statistics
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

    const [
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalAmountReceived,
      myApplications,
    ] = await Promise.all([
      prisma.studentScholarship.count({
        where: { studentId },
      }),
      prisma.studentScholarship.count({
        where: { studentId, status: 'Pending' },
      }),
      prisma.studentScholarship.count({
        where: { studentId, status: 'Approved' },
      }),
      prisma.studentScholarship.count({
        where: { studentId, status: 'Rejected' },
      }),
      prisma.studentScholarship
        .findMany({
          where: { studentId, status: 'Approved' },
          include: { scholarship: { select: { amount: true } } },
        })
        .then(apps =>
          apps.reduce((sum, app) => sum + app.scholarship.amount, 0)
        ),
      prisma.studentScholarship.findMany({
        where: { studentId },
        include: {
          scholarship: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Get available scholarships (active and not yet applied)
    const appliedScholarshipIds = await prisma.studentScholarship
      .findMany({
        where: { studentId },
        select: { scholarshipId: true },
      })
      .then(apps => apps.map(a => a.scholarshipId));

    const availableScholarships = await prisma.scholarship.findMany({
      where: {
        isActive: true,
        id: { notIn: appliedScholarshipIds },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalApplications,
          pendingApplications,
          approvedApplications,
          rejectedApplications,
          totalAmountReceived,
        },
        myApplications,
        availableScholarships,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard statistics' },
      { status: 500 }
    );
  }
}
