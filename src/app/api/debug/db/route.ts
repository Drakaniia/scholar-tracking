import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // Test 1: Check env vars (safe - just check if they're set, not their values)
    const envStatus = {
      databaseUrl: !!process.env.DATABASE_URL,
      directDatabaseUrl: !!process.env.DIRECT_DATABASE_URL,
      jwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV,
    };

    // Test 2: Try a simple Prisma query
    let dbStatus = 'untested';
    let dbError: string | null = null;
    try {
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      dbStatus = 'connected';
      console.log('DB test result:', result);
    } catch (e) {
      dbStatus = 'failed';
      dbError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }

    // Test 3: Try to count users
    let userCount: number | null = null;
    let userError: string | null = null;
    try {
      userCount = await prisma.user.count();
    } catch (e) {
      userError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
    }

    return NextResponse.json({
      success: true,
      env: envStatus,
      database: {
        status: dbStatus,
        error: dbError,
      },
      users: {
        count: userCount,
        error: userError,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      },
      { status: 500 }
    );
  }
}
