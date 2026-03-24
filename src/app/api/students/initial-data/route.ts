import { NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

// GET /api/students/initial-data - Combined endpoint for initial page load
// Returns programs, scholarships, and initial counts in a single request
export async function GET() {
  try {
    // Fetch all initial data in parallel
    const [programsResult, scholarshipsResult, totalStudentsResult] = await Promise.all([
      // Get distinct programs
      prisma.student.groupBy({
        by: ['program'],
        where: { isArchived: false },
        _count: {
          id: true,
        },
      }),
      // Get all active scholarships
      prisma.scholarship.findMany({
        where: {
          status: 'ACTIVE',
          isArchived: false,
        },
        select: {
          id: true,
          scholarshipName: true,
          sponsor: true,
          type: true,
          source: true,
          status: true,
          amount: true,
        },
        orderBy: {
          scholarshipName: 'asc',
        },
      }),
      // Get total student count
      prisma.student.count({
        where: { isArchived: false },
      }),
    ]);

    // Get students without scholarships
    const studentsWithoutScholarship = await prisma.student.count({
      where: {
        isArchived: false,
        scholarships: {
          none: {},
        },
      },
    });

    // Calculate students with scholarships
    const studentsWithScholarships = totalStudentsResult - studentsWithoutScholarship;

    // Format programs with counts
    const programs = programsResult
      .map((item) => item.program)
      .filter((program): program is string => !!program)
      .sort();

    const programCounts: Record<string, number> = {};
    programsResult.forEach((item) => {
      if (item.program) {
        programCounts[item.program] = item._count.id;
      }
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          programs,
          programCounts,
          scholarships: scholarshipsResult,
          totalStudents: totalStudentsResult,
          studentsWithScholarships,
          studentsWithoutScholarship,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-Cache-Source': 'combined-initial-data',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching initial data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch initial data' },
      { status: 500 }
    );
  }
}
