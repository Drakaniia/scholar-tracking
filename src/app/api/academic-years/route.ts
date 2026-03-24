import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface AcademicYearData {
  year: string;
  startDate: string;
  endDate: string;
  semester: string;
  isActive?: boolean;
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    // Get active academic year
    if (action === 'active') {
      const activeYear = await prisma.academicYear.findFirst({
        where: { isActive: true },
      });
      return NextResponse.json({ success: true, data: activeYear });
    }

    // Get all academic years with pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [academicYears, total] = await Promise.all([
      prisma.academicYear.findMany({
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
      }),
      prisma.academicYear.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: academicYears,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching academic years:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch academic years' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    // Only ADMIN can create academic years
    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body: AcademicYearData = await request.json();
    const { year, startDate, endDate, semester, isActive = false } = body;

    // Validation
    if (!year || !startDate || !endDate || !semester) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if year already exists
    const existing = await prisma.academicYear.findUnique({
      where: { year },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Academic year already exists' },
        { status: 400 }
      );
    }

    // If setting as active, deactivate other years
    if (isActive) {
      await prisma.academicYear.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const academicYear = await prisma.academicYear.create({
      data: {
        year,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        semester,
        isActive,
      },
    });

    return NextResponse.json({ success: true, data: academicYear });
  } catch (error) {
    console.error('Error creating academic year:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create academic year' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    // Only ADMIN can update academic years
    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Academic year ID required' },
        { status: 400 }
      );
    }

    const body: Partial<AcademicYearData> = await request.json();

    // If setting as active, deactivate other years
    if (body.isActive) {
      await prisma.academicYear.updateMany({
        where: { isActive: true, id: { not: parseInt(id) } },
        data: { isActive: false },
      });
    }

    const updateData: Record<string, unknown> = {};
    if (body.year) updateData.year = body.year;
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);
    if (body.semester !== undefined) updateData.semester = body.semester;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const academicYear = await prisma.academicYear.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: academicYear });
  } catch (error) {
    console.error('Error updating academic year:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update academic year' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Only ADMIN can delete academic years
    if (payload.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Academic year ID required' },
        { status: 400 }
      );
    }

    const academicYear = await prisma.academicYear.findUnique({
      where: { id: parseInt(id) },
      include: {
        studentFees: true,
        disbursements: true,
      },
    });

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: 'Academic year not found' },
        { status: 404 }
      );
    }

    // Check if academic year is in use
    if (academicYear.studentFees.length > 0 || academicYear.disbursements.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cannot delete academic year that is in use by student fees or disbursements',
        },
        { status: 400 }
      );
    }

    await prisma.academicYear.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting academic year:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete academic year' },
      { status: 500 }
    );
  }
}
