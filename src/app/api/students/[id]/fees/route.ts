import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { queryOptimizer } from '@/lib/query-optimizer';
import { CreateStudentFeesInput } from '@/types';

// GET /api/students/[id]/fees - Get all fees for a student
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const studentId = parseInt(id);

    if (isNaN(studentId)) {
      return NextResponse.json({ success: false, error: 'Invalid student ID' }, { status: 400 });
    }

    const fees = await prisma.studentFees.findMany({
      where: { studentId },
      orderBy: { academicYear: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: fees,
    });
  } catch (error) {
    console.error('Error fetching student fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch student fees' },
      { status: 500 }
    );
  }
}

// POST /api/students/[id]/fees - Create or update student fees
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const studentId = parseInt(id);

    if (isNaN(studentId)) {
      return NextResponse.json({ success: false, error: 'Invalid student ID' }, { status: 400 });
    }

    const body: CreateStudentFeesInput & { academicYearId?: number; id?: number } =
      await request.json();

    // Calculate percentSubsidy from amountSubsidy and total fees
    const totalFees =
      Number(body.tuitionFee) +
      Number(body.miscellaneousFee) +
      Number(body.laboratoryFee) +
      Number(body.otherFee);

    const percentSubsidy = totalFees > 0 ? (Number(body.amountSubsidy) / totalFees) * 100 : 0;

    let fees;
    let wasUpdated = false;

    // If id is provided, update by id directly
    if (body.id) {
      // Update existing fees by id
      fees = await prisma.studentFees.update({
        where: { id: body.id },
        data: {
          tuitionFee: body.tuitionFee,
          miscellaneousFee: body.miscellaneousFee,
          laboratoryFee: body.laboratoryFee,
          otherFee: body.otherFee,
          amountSubsidy: body.amountSubsidy,
          percentSubsidy,
          term: body.term,
          academicYear: body.academicYear,
          academicYearId: body.academicYearId || null,
        },
      });
      wasUpdated = true;
    } else {
      // Check if fees already exist for this term and academic year
      const existingFees = await prisma.studentFees.findFirst({
        where: {
          studentId,
          term: body.term,
          academicYear: body.academicYear,
        },
      });

      if (existingFees) {
        // Update existing fees
        fees = await prisma.studentFees.update({
          where: { id: existingFees.id },
          data: {
            tuitionFee: body.tuitionFee,
            miscellaneousFee: body.miscellaneousFee,
            laboratoryFee: body.laboratoryFee,
            otherFee: body.otherFee,
            amountSubsidy: body.amountSubsidy,
            percentSubsidy,
            academicYearId: body.academicYearId || null,
          },
        });
        wasUpdated = true;
      } else {
        // Create new fees
        fees = await prisma.studentFees.create({
          data: {
            studentId,
            tuitionFee: body.tuitionFee,
            miscellaneousFee: body.miscellaneousFee,
            laboratoryFee: body.laboratoryFee,
            otherFee: body.otherFee,
            amountSubsidy: body.amountSubsidy,
            percentSubsidy,
            term: body.term,
            academicYear: body.academicYear,
            academicYearId: body.academicYearId || null,
          },
        });
      }
    }

    // Invalidate cache
    queryOptimizer.invalidatePattern(`student-${studentId}-fees`);
    queryOptimizer.invalidatePattern(`student-${studentId}`);
    queryOptimizer.invalidatePattern('students-list');
    queryOptimizer.invalidatePattern('dashboard');

    return NextResponse.json({
      success: true,
      data: fees,
      message: wasUpdated
        ? 'Student fees updated successfully'
        : 'Student fees created successfully',
    });
  } catch (error) {
    console.error('Error saving student fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save student fees' },
      { status: 500 }
    );
  }
}

// DELETE /api/students/[id]/fees - Delete student fees
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const studentId = parseInt(id);

    if (isNaN(studentId)) {
      return NextResponse.json({ success: false, error: 'Invalid student ID' }, { status: 400 });
    }

    const searchParams = request.nextUrl.searchParams;
    const term = searchParams.get('term');
    const academicYear = searchParams.get('academicYear');

    if (!term || !academicYear) {
      return NextResponse.json(
        { success: false, error: 'Term and academic year are required' },
        { status: 400 }
      );
    }

    await prisma.studentFees.deleteMany({
      where: {
        studentId,
        term,
        academicYear,
      },
    });

    // Invalidate cache
    queryOptimizer.invalidatePattern(`student-${studentId}-fees`);
    queryOptimizer.invalidatePattern(`student-${studentId}`);
    queryOptimizer.invalidatePattern('students-list');
    queryOptimizer.invalidatePattern('dashboard');

    return NextResponse.json({
      success: true,
      message: 'Student fees deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting student fees:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete student fees' },
      { status: 500 }
    );
  }
}
