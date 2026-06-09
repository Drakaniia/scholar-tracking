import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { getSession, logAudit } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { queryOptimizer } from '@/lib/query-optimizer';

const permanentDeleteScholarshipsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1, 'Select at least one archived scholarship'),
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
    const parsedBody = permanentDeleteScholarshipsSchema.safeParse(body);

    if (!parsedBody.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid delete request', details: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const scholarshipIds = Array.from(new Set(parsedBody.data.ids));
    const archivedScholarships = await prisma.scholarship.findMany({
      where: { id: { in: scholarshipIds }, isArchived: true },
      select: { id: true, scholarshipName: true },
    });

    if (archivedScholarships.length !== scholarshipIds.length) {
      return NextResponse.json(
        { success: false, error: 'Only archived scholarships can be permanently deleted' },
        { status: 400 }
      );
    }

    const deleteResult = await prisma.$transaction(async (tx) => {
      await tx.disbursement.deleteMany({ where: { scholarshipId: { in: scholarshipIds } } });
      await tx.studentScholarship.deleteMany({
        where: { scholarshipId: { in: scholarshipIds } },
      });

      return tx.scholarship.deleteMany({
        where: { id: { in: scholarshipIds }, isArchived: true },
      });
    });

    queryOptimizer.invalidatePattern('scholarships-list');
    queryOptimizer.invalidatePattern('scholarships-counts');
    queryOptimizer.invalidatePattern('students-list');
    queryOptimizer.invalidatePattern('dashboard');

    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await logAudit(
      session.id,
      'SCHOLARSHIPS_PERMANENTLY_DELETED',
      'SCHOLARSHIP',
      undefined,
      {
        deletedCount: deleteResult.count,
        scholarships: archivedScholarships.map((scholarship) => ({
          id: scholarship.id,
          name: scholarship.scholarshipName,
        })),
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      data: { deletedCount: deleteResult.count },
      message: `${deleteResult.count} archived scholarship(s) permanently deleted`,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error permanently deleting archived scholarships:', error.message);
    } else {
      console.error('Error permanently deleting archived scholarships:', error);
    }

    return NextResponse.json(
      { success: false, error: 'Failed to permanently delete archived scholarships' },
      { status: 500 }
    );
  }
}
