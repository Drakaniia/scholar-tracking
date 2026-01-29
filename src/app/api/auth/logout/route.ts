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

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    // Still destroy session even if audit log fails
    try {
      await destroySession();
    } catch (e) {
      console.error('Failed to destroy session:', e);
    }
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}