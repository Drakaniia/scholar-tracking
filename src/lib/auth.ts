import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';
import type { User } from '@prisma/client';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key'
);

export interface SessionUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// Password utilities
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// JWT utilities
export async function createToken(user: SessionUser): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.user as SessionUser;
  } catch {
    return null;
  }
}

// Session management
export async function createSession(user: User, ipAddress?: string, userAgent?: string) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours

  await prisma.session.create({
    data: {
      id: sessionId,
      userId: user.id,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });

  const token = await createToken({
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  });

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 8 * 60 * 60, // 8 hours
    path: '/',
  });

  return { sessionId, token };
}

export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    
    if (!token) return null;
    
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token')?.value;
  
  if (token) {
    const user = await verifyToken(token);
    if (user) {
      // Remove all sessions for this user
      await prisma.session.deleteMany({
        where: { userId: user.id },
      });
    }
  }
  
  cookieStore.delete('auth-token');
}

// Account lockout utilities
export async function checkAccountLockout(username: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { lockedUntil: true },
  });

  if (!user?.lockedUntil) return false;
  
  return user.lockedUntil > new Date();
}

export async function incrementFailedAttempts(username: string) {
  const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5');
  const lockoutDuration = parseInt(process.env.LOCKOUT_DURATION_MINUTES || '15');

  const user = await prisma.user.findUnique({
    where: { username },
    select: { id: true, failedLoginAttempts: true },
  });

  if (!user) return;

  const newAttempts = user.failedLoginAttempts + 1;
  const shouldLock = newAttempts >= maxAttempts;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: newAttempts,
      lockedUntil: shouldLock 
        ? new Date(Date.now() + lockoutDuration * 60 * 1000)
        : null,
    },
  });
}

export async function resetFailedAttempts(username: string) {
  await prisma.user.updateMany({
    where: { username },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date(),
    },
  });
}

// Audit logging
export async function logAudit(
  userId: number | null,
  action: string,
  resourceType?: string,
  resourceId?: number,
  details?: Record<string, unknown>,
  ipAddress?: string,
  userAgent?: string
) {
  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resourceType,
      resourceId,
      details: details ? JSON.parse(JSON.stringify(details)) : null,
      ipAddress,
      userAgent,
    },
  });
}