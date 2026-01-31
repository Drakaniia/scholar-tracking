import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateScholarshipInput } from '@/types';
import { getSession } from '@/lib/auth';
import { getPaginationParams, buildSearchWhere, queryOptimizer, generateQueryKey } from '@/lib/query-optimizer';

// GET /api/scholarships - Get all scholarships
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const source = searchParams.get('source') || '';
        const status = searchParams.get('status') || '';

        // Use server-side cache for scholarship queries
        const cacheKey = generateQueryKey('scholarships-list', { page, limit, search, type, source, status });
        const cachedData = queryOptimizer.get<{ scholarships: unknown[]; total: number }>(cacheKey);
        
        if (cachedData) {
            return NextResponse.json({
                success: true,
                data: cachedData.scholarships,
                total: cachedData.total,
                page,
                limit,
                totalPages: Math.ceil(cachedData.total / limit),
                cached: true,
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                    'CDN-Cache-Control': 'public, s-maxage=60',
                    'X-Cache': 'HIT',
                },
            });
        }

        const { skip, take } = getPaginationParams(page, limit);

        const additionalFilters: Record<string, unknown> = {};
        if (type) additionalFilters.type = type;
        if (source) additionalFilters.source = source;
        if (status) additionalFilters.status = status;

        const where = buildSearchWhere(
            search,
            ['scholarshipName', 'sponsor'],
            additionalFilters
        );

        const [scholarships, total] = await Promise.all([
            prisma.scholarship.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    scholarshipName: true,
                    sponsor: true,
                    type: true,
                    source: true,
                    amount: true,
                    requirements: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: { students: true },
                    },
                },
            }),
            prisma.scholarship.count({ where }),
        ]);

        // Cache for 90 seconds
        queryOptimizer.set(cacheKey, { scholarships, total }, 90 * 1000);

        return NextResponse.json({
            success: true,
            data: scholarships,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            cached: false,
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
                'CDN-Cache-Control': 'public, s-maxage=60',
                'X-Cache': 'MISS',
            },
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
        const session = await getSession();
        
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 403 }
            );
        }

        const body: CreateScholarshipInput = await request.json();

        const scholarship = await prisma.scholarship.create({
            data: {
                scholarshipName: body.scholarshipName,
                sponsor: body.sponsor,
                type: body.type,
                source: body.source,
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
