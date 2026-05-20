import { NextResponse } from 'next/server';

import { runDueAcademicYearPromotions } from '@/lib/academic-year-service';

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await runDueAcademicYearPromotions();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error running scheduled academic year promotion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run scheduled academic year promotion' },
      { status: 500 }
    );
  }
}
