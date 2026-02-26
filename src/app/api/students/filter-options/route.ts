import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/students/filter-options - Get distinct programs for filtering
export async function GET() {
    try {
        const programs = await prisma.student.findMany({
            select: {
                program: true,
            },
            distinct: ['program'],
            orderBy: {
                program: 'asc',
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                programs: programs.map(p => p.program),
            },
        });
    } catch (error) {
        console.error('Error fetching filter options:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to fetch filter options' },
            { status: 500 }
        );
    }
}
