import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/scholarships/filter-options - Get filter options with counts based on current filters
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const source = searchParams.get('source') || '';

        // Build where clause based on provided filters
        const where: Record<string, unknown> = {
            isArchived: false,
        };

        if (source && source !== 'all') {
            where.source = source;
        }

        // Use Promise.all to execute aggregation queries in parallel
        const [
            totalResult,
            sourceAgg,
        ] = await Promise.all([
            // Get total count
            prisma.scholarship.count({ where }),
            // Get source counts
            prisma.scholarship.groupBy({
                by: ['source'],
                where,
                _count: {
                    id: true,
                },
            }),
        ]);

        // Convert aggregation results to count maps
        const sourceCounts: Record<string, number> = {};

        sourceAgg.forEach(item => {
            if (item.source) {
                sourceCounts[item.source] = item._count.id;
            }
        });

        return NextResponse.json({
            success: true,
            data: {
                total: totalResult,
                internal: sourceCounts['INTERNAL'] || 0,
                external: sourceCounts['EXTERNAL'] || 0,
            },
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
                'X-Cache-Source': 'database-aggregation',
            },
        });
    } catch (error) {
        console.error('Error fetching scholarship filter options:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch filter options' },
            { status: 500 }
        );
    }
}