import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

export const verifyPassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (
  userId: number,
  email: string,
  role: string,
  studentId?: number
): string => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign({ userId, email, role, studentId }, secret, {
    expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string) => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  try {
    return jwt.verify(token, secret) as {
      userId: number;
      email: string;
      role: string;
      studentId?: number;
    };
  } catch (error) {
    return null;
  }
};

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
};

export const getCurrentUserFromRequest = async (request: NextRequest) => {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return null;
  }

  return verifyToken(token);
};

export const isAdmin = (user: { role?: string } | null): boolean => {
  return user?.role === 'admin';
};

export const isStaff = (user: { role?: string } | null): boolean => {
  return user?.role === 'staff';
};

export const isStudent = (user: { role?: string } | null): boolean => {
  return user?.role === 'student';
};

export const hasRole = (
  user: { role?: string } | null,
  roles: string[]
): boolean => {
  return user?.role ? roles.includes(user.role) : false;
};
