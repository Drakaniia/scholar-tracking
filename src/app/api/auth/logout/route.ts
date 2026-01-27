import { NextRequest, NextResponse } from 'next/server';
import { getSession, destroySession, logAudit } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (user) {
      await logAudit(user.id, 'LOGOUT', 'USER', user.id, undefined, ipAddress, userAgent);
    }

    await destroySession();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}