import { NextRequest, NextResponse } from 'next/server';

import { z } from 'zod';

import { getSession, logAudit } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const updateUserSchema = z.object({
  role: z.enum(['ADMIN', 'STAFF', 'VIEWER']).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  email: z.string().email('Invalid email address').optional(),
});

// PUT /api/users/[id] - Update user (admin only)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateUserSchema.parse(body);

    // Prevent admin from changing their own role
    if (userId === session.id && validatedData.role) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }

    // Check if email is being changed and if it already exists
    if (validatedData.email) {
      const existingEmail = await prisma.user.findFirst({
        where: {
          email: validatedData.email,
          NOT: { id: userId },
        },
      });

      if (existingEmail) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: validatedData,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
      },
    });

    // Get client IP and user agent for audit log
    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log audit
    await logAudit(
      session.id,
      'USER_UPDATED',
      'USER',
      userId,
      { updatedFields: Object.keys(validatedData) },
      ipAddress,
      userAgent
    );

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('Error updating user:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Prevent self-deletion
    if (userId === session.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Check if user exists
    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, role: true },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent deletion of last admin
    if (userToDelete.role === 'ADMIN') {
      const adminCount = await prisma.user.count({
        where: { role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last admin user' }, { status: 400 });
      }
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    // Get client IP and user agent for audit log
    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log audit
    await logAudit(
      session.id,
      'USER_DELETED',
      'USER',
      userId,
      { deletedUsername: userToDelete.username },
      ipAddress,
      userAgent
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting user:', error);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
