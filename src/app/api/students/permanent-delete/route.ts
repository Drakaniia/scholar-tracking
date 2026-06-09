import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { getSession, logAudit } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queryOptimizer } from '@/lib/query-optimizer';

const permanentDeleteStudentsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Select at least one archived student'),
});

async function readJsonBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return null;
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const body = await readJsonBody(request);
    const parsedBody = permanentDeleteStudentsSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid delete request', details: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const studentIds = Array.from(new Set(parsedBody.data.ids));
    const archivedStudents = await prisma.student.findMany({
      where: { id: { in: studentIds }, isArchived: true },
      select: { id: true, firstName: true, lastName: true },
    });

    if (archivedStudents.length !== studentIds.length) {
      return NextResponse.json(
        { success: false, error: 'Only archived students can be permanently deleted' },
        { status: 400 }
      );
    }

    const deleteResult = await prisma.$transaction(async (tx) => {
      await tx.studentScholarship.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.disbursement.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.studentFees.deleteMany({ where: { studentId: { in: studentIds } } });
      await tx.studentAcademicRecord.deleteMany({ where: { studentId: { in: studentIds } } });

      return tx.student.deleteMany({
        where: { id: { in: studentIds }, isArchived: true },
      });
    });

    queryOptimizer.invalidatePattern('students-list');
    queryOptimizer.invalidatePattern('dashboard');

    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAudit(
      session.id,
      'STUDENTS_PERMANENTLY_DELETED',
      'STUDENT',
      undefined,
      {
        deletedCount: deleteResult.count,
        students: archivedStudents.map((student) => ({
          id: student.id,
          name: `${student.firstName} ${student.lastName}`,
        })),
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      data: { deletedCount: deleteResult.count },
      message: `${deleteResult.count} archived student(s) permanently deleted`,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error permanently deleting archived students:', error.message);
    } else {
      console.error('Error permanently deleting archived students:', error);
    }

    return NextResponse.json(
      { success: false, error: 'Failed to permanently delete archived students' },
      { status: 500 }
    );
  }
}
