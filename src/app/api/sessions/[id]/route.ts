import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession, logAudit } from '@/lib/auth';

// DELETE /api/sessions/[id] - Revoke a session (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const sessionId = id;

    // Check if session exists
    const sessionToRevoke = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    if (!sessionToRevoke) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Prevent revoking own session - we need to get current session ID from cookie
    const cookieStore = await request.cookies;
    const token = cookieStore.get('auth-token')?.value;
    
    if (token) {
      // Find current user's active sessions
      const currentUserSessions = await prisma.session.findMany({
        where: { userId: session.id },
        select: { id: true },
      });
      
      const currentSessionIds = currentUserSessions.map(s => s.id);
      
      if (currentSessionIds.includes(sessionId)) {
        return NextResponse.json(
          { error: 'Cannot revoke your own active session' },
          { status: 400 }
        );
      }
    }

    // Delete session
    await prisma.session.delete({
      where: { id: sessionId },
    });

    // Get client IP and user agent for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log audit
    await logAudit(
      session.id,
      'SESSION_REVOKED',
      'SESSION',
      sessionToRevoke.userId,
      { 
        revokedSessionId: sessionId,
        targetUsername: sessionToRevoke.user.username,
      },
      ipAddress,
      userAgent
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Session revoked successfully' 
    });
  } catch (error) {
    console.error('Error revoking session:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
