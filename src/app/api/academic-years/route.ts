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
  promotionDate?: string | null;
}

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseDateInput(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    throw new Error(`Invalid ${fieldName}`);
  }

  const normalizedValue = value.trim();
  const dateInputMatch = normalizedValue.match(DATE_INPUT_PATTERN);
  const date = dateInputMatch
    ? new Date(
        Date.UTC(
          Number(dateInputMatch[1]),
          Number(dateInputMatch[2]) - 1,
          Number(dateInputMatch[3])
        )
      )
    : new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ${fieldName}`);
  }

  if (
    dateInputMatch &&
    (date.getUTCFullYear() !== Number(dateInputMatch[1]) ||
      date.getUTCMonth() !== Number(dateInputMatch[2]) - 1 ||
      date.getUTCDate() !== Number(dateInputMatch[3]))
  ) {
    throw new Error(`Invalid ${fieldName}`);
  }

  return date;
}

function parseOptionalDateInput(value: string | null | undefined, fieldName: string) {
  if (!value) {
    return null;
  }
  return parseDateInput(value, fieldName);
}

function validateAcademicYearDateRange(startDate: Date, endDate: Date) {
  if (startDate > endDate) {
    throw new Error('Start date must be before end date');
  }
}

function sameDateOnlyValue(left: Date | null, right: Date | null) {
  if (!left || !right) {
    return left === right;
  }

  return left.toISOString().slice(0, 10) === right.toISOString().slice(0, 10);
}

function parseAcademicYearId(value: string | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function getPrismaErrorCode(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return (error as { code?: string }).code;
  }

  return undefined;
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
        orderBy: { startDate: 'desc' },
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
    const { year, startDate, endDate, semester, isActive = false, promotionDate } = body;

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

    let parsedStartDate: Date;
    let parsedEndDate: Date;
    let parsedPromotionDate: Date | null;

    try {
      parsedStartDate = parseDateInput(startDate, 'start date');
      parsedEndDate = parseDateInput(endDate, 'end date');
      parsedPromotionDate = parseOptionalDateInput(promotionDate, 'promotion date');
      validateAcademicYearDateRange(parsedStartDate, parsedEndDate);
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid date' },
        { status: 400 }
      );
    }

    const academicYear = await prisma.$transaction(async (tx) => {
      if (isActive) {
        await tx.academicYear.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      return tx.academicYear.create({
        data: {
          year,
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          semester,
          isActive,
          promotionDate: parsedPromotionDate,
        },
      });
    });

    return NextResponse.json({ success: true, data: academicYear });
  } catch (error) {
    console.error('Error creating academic year:', error);
    if (getPrismaErrorCode(error) === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Academic year already exists' },
        { status: 400 }
      );
    }

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
    const academicYearId = parseAcademicYearId(searchParams.get('id'));

    if (!academicYearId) {
      return NextResponse.json(
        { success: false, error: 'Academic year ID required' },
        { status: 400 }
      );
    }

    const body: Partial<AcademicYearData> = await request.json();

    const existingAcademicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!existingAcademicYear) {
      return NextResponse.json(
        { success: false, error: 'Academic year not found' },
        { status: 404 }
      );
    }

    if (body.year && body.year !== existingAcademicYear.year) {
      const duplicateAcademicYear = await prisma.academicYear.findUnique({
        where: { year: body.year },
      });

      if (duplicateAcademicYear && duplicateAcademicYear.id !== academicYearId) {
        return NextResponse.json(
          { success: false, error: 'Academic year already exists' },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (body.year) updateData.year = body.year;
    let nextStartDate = existingAcademicYear.startDate;
    let nextEndDate = existingAcademicYear.endDate;
    try {
      if (body.startDate !== undefined) {
        nextStartDate = parseDateInput(body.startDate, 'start date');
        updateData.startDate = nextStartDate;
      }
      if (body.endDate !== undefined) {
        nextEndDate = parseDateInput(body.endDate, 'end date');
        updateData.endDate = nextEndDate;
      }
      validateAcademicYearDateRange(nextStartDate, nextEndDate);
      if (body.promotionDate !== undefined) {
        const nextPromotionDate = parseOptionalDateInput(body.promotionDate, 'promotion date');
        updateData.promotionDate = nextPromotionDate;
        if (!sameDateOnlyValue(existingAcademicYear.promotionDate, nextPromotionDate)) {
          updateData.promotionProcessedAt = null;
        }
      }
    } catch (error) {
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Invalid date' },
        { status: 400 }
      );
    }
    if (body.semester !== undefined) updateData.semester = body.semester;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const academicYear = await prisma.$transaction(async (tx) => {
      if (body.isActive) {
        await tx.academicYear.updateMany({
          where: { isActive: true, id: { not: academicYearId } },
          data: { isActive: false },
        });
      }

      return tx.academicYear.update({
        where: { id: academicYearId },
        data: updateData,
      });
    });

    return NextResponse.json({ success: true, data: academicYear });
  } catch (error) {
    console.error('Error updating academic year:', error);
    if (getPrismaErrorCode(error) === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Academic year already exists' },
        { status: 400 }
      );
    }

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
