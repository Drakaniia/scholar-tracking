import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// POST /api/admin/auth/logout - Admin logout
export async function POST() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete('auth_token');

        return NextResponse.json({
            success: true,
            message: 'Logged out successfully',
        });
    } catch (error) {
        console.error('Error during logout:', error);
        return NextResponse.json(
            { success: false, error: 'Logout failed' },
            { status: 500 }
        );
    }
}