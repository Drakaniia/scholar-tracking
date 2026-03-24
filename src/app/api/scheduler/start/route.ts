import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { initializeScheduler } from '@/lib/scheduler';

// POST /api/scheduler/start - Start the automated scheduler
export async function POST() {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    await initializeScheduler();

    return NextResponse.json({
      success: true,
      message: 'Scheduler started successfully',
    });
  } catch (error) {
    console.error('Error starting scheduler:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start scheduler' },
      { status: 500 }
    );
  }
}
