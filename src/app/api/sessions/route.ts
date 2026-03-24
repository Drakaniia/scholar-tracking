import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/sessions - List all active sessions (admin only)
export async function GET() {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const sessions = await prisma.session.findMany({
      where: {
        expiresAt: {
          gt: new Date(), // Only active sessions
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
