import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserFromRequest, hasRole } from '@/lib/auth';

// GET /api/admin/dashboard - Get dashboard statistics (admin/staff only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user || !hasRole(user, ['admin', 'staff'])) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [
      totalStudents,
      totalScholarships,
      activeScholarships,
      pendingApplications,
      approvedApplications,
      approvedScholarshipsData,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.scholarship.count(),
      prisma.scholarship.count({ where: { isActive: true } }),
      prisma.studentScholarship.count({ where: { status: 'Pending' } }),
      prisma.studentScholarship.count({ where: { status: 'Approved' } }),
      prisma.studentScholarship.findMany({
        where: { status: 'Approved' },
        include: { scholarship: { select: { amount: true } } },
      }),
    ]);

    const totalAmountAwarded = approvedScholarshipsData.reduce(
      (sum, app) => sum + app.scholarship.amount,
      0
    );

    // Get recent applications
    const recentApplications = await prisma.studentScholarship.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        student: true,
        scholarship: true,
      },
    });

    // Get upcoming deadlines
    const upcomingDeadlines = await prisma.scholarship.findMany({
      where: {
        isActive: true,
        applicationEnd: {
          gte: new Date(),
        },
      },
      orderBy: { applicationEnd: 'asc' },
      take: 5,
    });

    // Get students by education level
    const studentsByEducationLevel = await prisma.student.groupBy({
      by: ['educationLevel'],
      _count: { id: true },
    });

    // Get scholarships by type
    const scholarshipsByType = await prisma.scholarship.groupBy({
      by: ['type'],
      _count: { id: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          totalStudents,
          totalScholarships,
          activeScholarships,
          pendingApplications,
          approvedApplications,
          totalAmountAwarded,
        },
        recentApplications,
        upcomingDeadlines,
        charts: {
          studentsByEducationLevel,
          scholarshipsByType,
        },
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
