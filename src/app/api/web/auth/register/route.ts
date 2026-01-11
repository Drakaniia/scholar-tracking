import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateToken } from '@/lib/auth';
import { validateStudentRegistration } from '@/lib/validations';
import { cookies } from 'next/headers';

// POST /api/web/auth/register - Student registration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validationErrors = validateStudentRegistration(body);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: validationErrors.join(', ') },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Check if user email already exists
    const emailExists = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (emailExists) {
      return NextResponse.json(
        { success: false, error: 'Student email already exists' },
        { status: 400 }
      );
    }

    // Create student record
    const student = await prisma.student.create({
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        course: body.course,
        yearLevel: body.yearLevel,
        educationLevel: body.educationLevel,
        tuitionFee: body.tuitionFee,
      },
    });

    // Create user account linked to student
    const hashedPassword = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        email: body.email,
        password: hashedPassword,
        firstName: body.firstName,
        lastName: body.lastName,
        role: 'student',
        isActive: true,
        studentId: student.id,
      },
    });

    const token = generateToken(
      user.id,
      user.email,
      user.role,
      user.studentId || undefined
    );

    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          studentId: user.studentId,
        },
        student,
      },
      message: 'Registration successful',
    });
  } catch (error) {
    console.error('Error during registration:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
}
