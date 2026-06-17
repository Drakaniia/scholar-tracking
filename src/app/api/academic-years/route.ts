import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { queryOptimizer } from '@/lib/query-optimizer';
import { canManageStudentsAndScholarships } from '@/lib/rbac';
import { normalizeTermCode } from '@/lib/terms';

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

function parseSemester(value: string | null | undefined) {
  const semester = normalizeTermCode(value);
  if (!semester) {
    const acceptedValues = ['1ST', '2ND', '3RD'];
    throw new Error(`Invalid semester "${value}". Must be one of: ${acceptedValues.join(', ')}`);
  }
  return semester;
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

function invalidateAcademicYearDependentCaches() {
  queryOptimizer.invalidatePattern('students-list');
  queryOptimizer.invalidatePattern('students-filter-options');
  queryOptimizer.invalidatePattern('scholarship-flow');
  queryOptimizer.invalidatePattern('dashboard');
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
      console.error('Academic year creation failed: No auth token');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      console.error('Academic year creation failed: Invalid token');
      return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
    }

    if (!canManageStudentsAndScholarships(payload.role)) {
      console.error('Academic year creation failed: Insufficient permissions for user', payload.username);
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body: AcademicYearData = await request.json();
    console.log('Academic year creation request:', JSON.stringify(body, null, 2));
    
    const { year, startDate, endDate, semester, isActive = false, promotionDate } = body;

    // Enhanced validation with detailed logging
    if (!year?.trim()) {
      console.error('Academic year creation failed: Missing year field');
      return NextResponse.json(
        { success: false, error: 'Academic year is required' },
        { status: 400 }
      );
    }

    if (!startDate?.trim()) {
      console.error('Academic year creation failed: Missing startDate field');
      return NextResponse.json(
        { success: false, error: 'Start date is required' },
        { status: 400 }
      );
    }

    if (!endDate?.trim()) {
      console.error('Academic year creation failed: Missing endDate field');
      return NextResponse.json(
        { success: false, error: 'End date is required' },
        { status: 400 }
      );
    }

    if (!semester?.trim()) {
      console.error('Academic year creation failed: Missing semester field');
      return NextResponse.json(
        { success: false, error: 'Semester is required' },
        { status: 400 }
      );
    }

    let parsedSemester: string;
    try {
      parsedSemester = parseSemester(semester);
      console.log('Parsed semester:', parsedSemester);
    } catch (error) {
      console.error('Academic year creation failed: Invalid semester', semester, error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Invalid semester. Must be 1ST, 2ND, or 3RD' 
        },
        { status: 400 }
      );
    }

    // Check if year already exists
    const existing = await prisma.academicYear.findUnique({
      where: { year: year.trim() },
    });

    if (existing) {
      console.error('Academic year creation failed: Year already exists', year);
      return NextResponse.json(
        { success: false, error: `Academic year ${year} already exists` },
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
      
      console.log('Parsed dates:', {
        startDate: parsedStartDate.toISOString(),
        endDate: parsedEndDate.toISOString(),
        promotionDate: parsedPromotionDate?.toISOString() || null
      });
    } catch (error) {
      console.error('Academic year creation failed: Date validation error', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Invalid date format. Use YYYY-MM-DD format.' 
        },
        { status: 400 }
      );
    }

    const academicYear = await prisma.$transaction(async (tx) => {
      if (isActive) {
        console.log('Deactivating existing active academic years');
        await tx.academicYear.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
      }

      console.log('Creating new academic year with data:', {
        year: year.trim(),
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        semester: parsedSemester,
        isActive,
        promotionDate: parsedPromotionDate,
      });

      return tx.academicYear.create({
        data: {
          year: year.trim(),
          startDate: parsedStartDate,
          endDate: parsedEndDate,
          semester: parsedSemester,
          isActive,
          promotionDate: parsedPromotionDate,
        },
      });
    });

    console.log('Academic year created successfully:', academicYear);

    invalidateAcademicYearDependentCaches();

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

    if (!canManageStudentsAndScholarships(payload.role)) {
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
    if (body.semester !== undefined) {
      try {
        updateData.semester = parseSemester(body.semester);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: error instanceof Error ? error.message : 'Invalid semester' },
          { status: 400 }
        );
      }
    }
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

    invalidateAcademicYearDependentCaches();

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

    if (!canManageStudentsAndScholarships(payload.role)) {
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
        studentScholarships: true,
      },
    });

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: 'Academic year not found' },
        { status: 404 }
      );
    }

    // Check if academic year is in use
    if (
      academicYear.studentFees.length > 0 ||
      academicYear.disbursements.length > 0 ||
      academicYear.studentScholarships.length > 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Cannot delete academic year that is in use by student scholarship assignments, student fees, or disbursements',
        },
        { status: 400 }
      );
    }

    await prisma.academicYear.delete({
      where: { id: parseInt(id) },
    });

    invalidateAcademicYearDependentCaches();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting academic year:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete academic year' },
      { status: 500 }
    );
  }
}
