import { NextRequest, NextResponse } from 'next/server';

import { getSession } from '@/lib/auth';
import { isStudentEligibleForDisbursement } from '@/lib/graduation-service';

// GET /api/disbursements/check-eligibility?studentId=... - Check if student is eligible for disbursement
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session || (session.role !== 'ADMIN' && session.role !== 'STAFF')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, error: 'Student ID is required' },
        { status: 400 }
      );
    }

    const id = parseInt(studentId);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid student ID' }, { status: 400 });
    }

    const isEligible = await isStudentEligibleForDisbursement(id);

    return NextResponse.json({
      success: true,
      data: {
        studentId: id,
        isEligible,
      },
    });
  } catch (error) {
    console.error('Error checking disbursement eligibility:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check disbursement eligibility' },
      { status: 500 }
    );
  }
}
