import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

// GET /api/audit-logs/filter-options - Get unique filter values (admin only)
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get unique actions
    const actions = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });

    // Get unique resource types
    const resourceTypes = await prisma.auditLog.findMany({
      select: { resourceType: true },
      distinct: ['resourceType'],
      where: { resourceType: { not: null } },
      orderBy: { resourceType: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        actions: actions.map(a => a.action),
        resourceTypes: resourceTypes.map(r => r.resourceType).filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
