import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      {
        success: false,
        error:
          'Scheduled all-student promotion is disabled. Use Registry bulk promotion to select continuing Bosco/FSE students and archive non-continuing students.',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error running scheduled academic year promotion:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run scheduled academic year promotion' },
      { status: 500 }
    );
  }
}
