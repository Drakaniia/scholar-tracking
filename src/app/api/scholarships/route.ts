import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateScholarshipInput } from '@/types';

// GET /api/scholarships - Get all scholarships
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const status = searchParams.get('status') || '';

        const skip = (page - 1) * limit;

        const where = {
            AND: [
                search
                    ? {
                        OR: [
                            { scholarshipName: { contains: search, mode: 'insensitive' as const } },
                            { sponsor: { contains: search, mode: 'insensitive' as const } },
                        ],
                    }
                    : {},
                type ? { type } : {},
                status ? { status } : {},
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
                        select: { applications: true },
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

// POST /api/scholarships - Create a new scholarship
export async function POST(request: NextRequest) {
    try {
        const body: CreateScholarshipInput = await request.json();

        const scholarship = await prisma.scholarship.create({
            data: {
                scholarshipName: body.scholarshipName,
                sponsor: body.sponsor,
                type: body.type,
                amount: body.amount,
                requirements: body.requirements || null,
                status: body.status,
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
