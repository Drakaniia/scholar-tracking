import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserFromRequest, isStudent } from '@/lib/auth';

// GET /api/web/scholarships - Get available scholarships for students
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
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';
    const showApplied = searchParams.get('showApplied') === 'true';

    const skip = (page - 1) * limit;

    // Get scholarships already applied by this student
    const appliedScholarshipIds = await prisma.studentScholarship
      .findMany({
        where: { studentId },
        select: { scholarshipId: true },
      })
      .then(apps => apps.map(a => a.scholarshipId));

    const where = {
      AND: [
        { isActive: true },
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                {
                  description: {
                    contains: search,
                    mode: 'insensitive' as const,
                  },
                },
              ],
            }
          : {},
        type ? { type } : {},
        category ? { category } : {},
        !showApplied ? { id: { notIn: appliedScholarshipIds } } : {},
      ],
    };

    const [scholarships, total] = await Promise.all([
      prisma.scholarship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.scholarship.count({ where }),
    ]);

    // Mark which scholarships have been applied
    const scholarshipsWithStatus = scholarships.map(scholarship => ({
      ...scholarship,
      applied: appliedScholarshipIds.includes(scholarship.id),
    }));

    return NextResponse.json({
      success: true,
      data: scholarshipsWithStatus,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching scholarships:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scholarships' },
      { status: 500 }
    );
  }
}
