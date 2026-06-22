import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { getSession, logAudit } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queryOptimizer } from '@/lib/query-optimizer';

const permanentDeleteByIdsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Select at least one archived student'),
});

const permanentDeleteSelectAllSchema = z.object({
  selectAll: z.literal(true),
  filters: z.object({
    archived: z.boolean().optional(),
  }),
});

async function parseBody(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.selectAll === true) {
      const parsed = permanentDeleteSelectAllSchema.safeParse(body);
      if (!parsed.success) {
        return { success: false as const, error: 'Invalid selectAll payload', status: 400 as const };
      }
      return { success: true as const, mode: 'selectAll' as const, filters: parsed.data.filters };
    }

    const parsed = permanentDeleteByIdsSchema.safeParse(body);
    if (!parsed.success) {
      return {
        success: false as const,
        error: 'Provide either a non-empty ids array or selectAll: true with filters',
        status: 400 as const,
      };
    }

    return { success: true as const, mode: 'ids' as const, ids: Array.from(new Set(parsed.data.ids)) };
  } catch {
    return { success: false as const, error: 'Invalid request body', status: 400 as const };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const parsed = await parseBody(request);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error }, { status: parsed.status });
    }

    let studentIds: number[];
    let archivedSnapshot: { id: number; firstName: string; lastName: string }[];

    if (parsed.mode === 'selectAll') {
      const where: Record<string, unknown> = {};
      if (parsed.filters.archived === true) {
        where.isArchived = true;
      }

      const allArchived = await prisma.student.findMany({
        where,
        select: { id: true, firstName: true, lastName: true },
      });

      if (allArchived.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No archived students found matching the filters' },
          { status: 400 }
        );
      }

      studentIds = allArchived.map((s) => s.id);
      archivedSnapshot = allArchived;
    } else {
      studentIds = parsed.ids;
      archivedSnapshot = await prisma.student.findMany({
        where: { id: { in: studentIds }, isArchived: true },
        select: { id: true, firstName: true, lastName: true },
      });

      if (archivedSnapshot.length !== studentIds.length) {
        return NextResponse.json(
          { success: false, error: 'Only archived students can be permanently deleted' },
          { status: 400 }
        );
      }
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
        students: archivedSnapshot.map((student) => ({
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
