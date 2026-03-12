import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CreateScholarshipInput } from '@/types';
import { getSession } from '@/lib/auth';
import { getPaginationParams, buildSearchWhere, queryOptimizer, generateQueryKey } from '@/lib/query-optimizer';

// GET /api/scholarships - Get all scholarships or counts
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const action = searchParams.get('action');

        // Handle counts action - returns total counts by source
        if (action === 'counts') {
            const searchParams = request.nextUrl.searchParams;
            const archivedParam = searchParams.get('archived');
            const includeArchived = archivedParam === 'true';

            const cacheKey = generateQueryKey('scholarships-counts', {});
            const cachedData = queryOptimizer.get<{ total: number; internal: number; external: number }>(cacheKey);

            if (cachedData) {
                return NextResponse.json({
                    success: true,
                    data: cachedData,
                    cached: true,
                }, {
                    headers: {
                        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                        'CDN-Cache-Control': 'public, s-maxage=300',
                        'X-Cache': 'HIT',
                    },
                });
            }

            const [total, internal, external] = await Promise.all([
                prisma.scholarship.count({ where: { isArchived: includeArchived ? true : false } }),
                prisma.scholarship.count({ where: { source: 'INTERNAL', isArchived: includeArchived ? true : false } }),
                prisma.scholarship.count({ where: { source: 'EXTERNAL', isArchived: includeArchived ? true : false } }),
            ]);

            const counts = { total, internal, external };
            queryOptimizer.set(cacheKey, counts, 5 * 60 * 1000); // Cache for 5 minutes

            return NextResponse.json({
                success: true,
                data: counts,
                cached: false,
            }, {
                headers: {
                    'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
                    'CDN-Cache-Control': 'public, s-maxage=300',
                    'X-Cache': 'MISS',
                },
            });
        }

        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const search = searchParams.get('search') || '';
        const type = searchParams.get('type') || '';
        const source = searchParams.get('source') || '';
        const status = searchParams.get('status') || '';
        const archivedParam = searchParams.get('archived');
        const includeArchived = archivedParam === 'true';

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
            { ...additionalFilters, isArchived: includeArchived ? true : false }
        );

        const [scholarships, total] = await Promise.all([
            prisma.scholarship.findMany({
                where,
                skip,
                take,
                orderBy: { scholarshipName: 'asc' },
                select: {
                      id: true,
                      scholarshipName: true,
                      sponsor: true,
                      type: true,
                      source: true,
                      eligibleGradeLevels: true,
                      eligiblePrograms: true,
                      amount: true,
                      amountSubsidy: true,
                      percentSubsidy: true,
                      requirements: true,
                      status: true,
                      isArchived: true,
                      grantType: true,
                      coversTuition: true,
                      coversMiscellaneous: true,
                      coversLaboratory: true,
                      coversOther: true,
                      otherFeeName: true,
                      tuitionFee: true,
                      miscellaneousFee: true,
                      laboratoryFee: true,
                      otherFee: true,
                      createdAt: true,
                      updatedAt: true,
                      _count: {
                          select: { students: true },
                      },
                      students: {
                          select: {
                              student: {
                                  select: {
                                      fees: {
                                          select: {
                                              percentSubsidy: true,
                                          },
                                      },
                                  },
                              },
                          },
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
                eligibleGradeLevels: body.eligibleGradeLevels,
                eligiblePrograms: body.eligiblePrograms || null,
                amount: body.amount,
                requirements: body.requirements || null,
                status: body.status,
                grantType: body.grantType || 'FULL',
                coversTuition: body.coversTuition || false,
                coversMiscellaneous: body.coversMiscellaneous || false,
                coversLaboratory: body.coversLaboratory || false,
                coversOther: body.coversOther || false,
                otherFeeName: body.otherFeeName || null,
                tuitionFee: body.tuitionFee || 0,
                miscellaneousFee: body.miscellaneousFee || 0,
                laboratoryFee: body.laboratoryFee || 0,
                otherFee: body.otherFee || 0,
                amountSubsidy: body.amountSubsidy || 0,
                percentSubsidy: body.percentSubsidy !== undefined ? body.percentSubsidy : (() => {
                    const totalFees = (body.tuitionFee || 0) + (body.miscellaneousFee || 0) + (body.laboratoryFee || 0) + (body.otherFee || 0);
                    return totalFees > 0 ? ((body.amountSubsidy || 0) / totalFees) * 100 : 0;
                })(),
            },
        });

        // Invalidate cache
        queryOptimizer.invalidatePattern('scholarships-list');
        queryOptimizer.invalidate('scholarships-counts');

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
