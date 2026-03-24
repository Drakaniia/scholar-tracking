import { NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { processGraduatingStudents } from '@/lib/graduation-service';

// POST /api/graduation/process - Process graduating students and remove scholarships
export async function POST() {
  try {
    const session = await getSession();

    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const result = await processGraduatingStudents();

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Graduation processing completed successfully',
    });
  } catch (error) {
    console.error('Error processing graduation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process graduation' },
      { status: 500 }
    );
  }
}
