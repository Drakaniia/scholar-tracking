import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { 
  verifyPassword, 
  createSession, 
  checkAccountLockout, 
  incrementFailedAttempts, 
  resetFailedAttempts,
  logAudit 
} from '@/lib/auth';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = loginSchema.parse(body);

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if account is locked
    const isLocked = await checkAccountLockout(username);
    if (isLocked) {
      await logAudit(null, 'LOGIN_ATTEMPT_LOCKED', 'USER', undefined, { username }, ipAddress, userAgent);
      return NextResponse.json(
        { error: 'Account is temporarily locked due to too many failed attempts' },
        { status: 423 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      await logAudit(null, 'LOGIN_FAILED_USER_NOT_FOUND', 'USER', undefined, { username }, ipAddress, userAgent);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      await logAudit(user.id, 'LOGIN_FAILED_INACTIVE', 'USER', user.id, { status: user.status }, ipAddress, userAgent);
      return NextResponse.json(
        { error: 'Account is not active' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      await incrementFailedAttempts(username);
      await logAudit(user.id, 'LOGIN_FAILED_WRONG_PASSWORD', 'USER', user.id, undefined, ipAddress, userAgent);
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(username);

    // Create session (this sets the cookie)
    const { sessionId } = await createSession(user, ipAddress, userAgent);

    // Log successful login
    await logAudit(user.id, 'LOGIN_SUCCESS', 'USER', user.id, { sessionId }, ipAddress, userAgent);

    // Return success response
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });

    // Ensure cookie is set in response headers for production
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}