import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateScholarshipInput } from '@/types';
import { getCurrentUserFromRequest, hasRole } from '@/lib/auth';

// GET /api/admin/scholarships - Get all scholarships (admin/staff only)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user || !hasRole(user, ['admin', 'staff'])) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const category = searchParams.get('category') || '';
    const isActive = searchParams.get('isActive');

    const skip = (page - 1) * limit;

    const where = {
      AND: [
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
        isActive !== null && isActive !== ''
          ? { isActive: isActive === 'true' }
          : {},
      ],
    };

    const [scholarships, total] = await Promise.all([
      prisma.scholarship.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { students: true },
          },
        },
      }),
      prisma.scholarship.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: scholarships,
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

// POST /api/admin/scholarships - Create a new scholarship (admin/staff only)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user || !hasRole(user, ['admin', 'staff'])) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body: CreateScholarshipInput = await request.json();

    const scholarship = await prisma.scholarship.create({
      data: {
        name: body.name,
        description: body.description || null,
        type: body.type,
        category: body.type === 'External' ? body.category : null,
        amount: body.amount,
        eligibility: body.eligibility || null,
        applicationStart: body.applicationStart || null,
        applicationEnd: body.applicationEnd || null,
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      data: scholarship,
      message: 'Scholarship created successfully',
    });
  } catch (error) {
    console.error('Error creating scholarship:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create scholarship' },
      { status: 500 }
    );
  }
}
