import { NextRequest, NextResponse } from 'next/server';
import { getSession, destroySession, logAudit } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Always destroy session first to ensure logout succeeds
    await destroySession();

    // Try to log audit after session is destroyed
    if (user) {
      try {
        await logAudit(user.id, 'LOGOUT', 'USER', user.id, undefined, ipAddress, userAgent);
      } catch (auditError) {
        console.error('Failed to log logout audit:', auditError);
        // Continue with successful logout even if audit fails
      }
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    // Still try to destroy session even if other operations fail
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