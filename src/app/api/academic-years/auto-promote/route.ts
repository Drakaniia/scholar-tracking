import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { autoPromoteStudents } from '@/lib/academic-year-service';
import { verifyToken } from '@/lib/auth';

export async function POST() {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Only ADMIN can trigger auto-promotion
    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const userId = payload.id;

    // Trigger auto-promotion
    const result = await autoPromoteStudents(userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Successfully promoted ${result.promotedCount} students and graduated ${result.graduatedCount} students`,
        data: result,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in auto-promote students:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to promote students',
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Verify authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    // Get preview of students that would be promoted
    const prisma = (await import('@/lib/prisma')).default;
    const { getNextYearLevel, getActiveAcademicYear } = await import('@/lib/academic-year-service');

    const activeAcademicYear = await getActiveAcademicYear();

    const students = await prisma.student.findMany({
      where: {
        isArchived: false,
        graduationStatus: { not: 'Graduated' },
        status: 'Active',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        gradeLevel: true,
        yearLevel: true,
      },
    });

    const promotionPreview = students.map((student) => {
      const { nextYearLevel, isGraduating } = getNextYearLevel(
        student.gradeLevel,
        student.yearLevel
      );
      return {
        ...student,
        nextYearLevel: isGraduating ? 'Graduated' : nextYearLevel,
        action: isGraduating ? 'GRADUATE' : 'PROMOTE',
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        activeAcademicYear,
        totalStudents: students.length,
        preview: promotionPreview,
      },
    });
  } catch (error) {
    console.error('Error fetching promotion preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch promotion preview' },
      { status: 500 }
    );
  }
}
