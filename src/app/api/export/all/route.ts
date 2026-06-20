/**
 * Temporary data export endpoint for database migration.
 *
 * Reads ALL data from the database and returns it as structured JSON.
 * Protected by a secret key to prevent unauthorized access.
 *
 * IMPORTANT: Set EXPORT_SECRET_KEY in your Vercel environment variables.
 * Without it, this endpoint will refuse to serve data.
 *
 * Usage:
 *   Export all tables at once:
 *     GET /api/export/all?key=YOUR_SECRET_KEY
 *
 *   Export a single table (avoids Vercel size limits for large datasets):
 *     GET /api/export/all?key=YOUR_SECRET_KEY&table=students
 *     GET /api/export/all?key=YOUR_SECRET_KEY&table=scholarships
 *
 * Supported tables: users, academic_years, students, scholarships,
 *   promotion_runs, student_academic_records, student_scholarships,
 *   student_fees, disbursements, audit_logs, backups, sessions
 *
 * Steps:
 *   1. Deploy this file to Vercel (keep old database env vars)
 *   2. Set EXPORT_SECRET_KEY in Vercel env vars
 *   3. Hit the endpoint for each table
 *   4. Import into the new database
 */

import { NextRequest, NextResponse } from 'next/server';

import prisma from '@/lib/prisma';

const EXPORT_SECRET_KEY = process.env.EXPORT_SECRET_KEY;

// Map table names (used in the URL) to Prisma model accessors
const TABLE_MODELS: Record<string, () => any> = {
  users: () => prisma.user,
  academic_years: () => prisma.academicYear,
  students: () => prisma.student,
  scholarships: () => prisma.scholarship,
  promotion_runs: () => prisma.promotionRun,
  student_academic_records: () => prisma.studentAcademicRecord,
  student_scholarships: () => prisma.studentScholarship,
  student_fees: () => prisma.studentFees,
  disbursements: () => prisma.disbursement,
  audit_logs: () => prisma.auditLog,
  backups: () => prisma.backup,
  sessions: () => prisma.session,
};

const TABLE_NAMES = Object.keys(TABLE_MODELS);

export async function GET(request: NextRequest) {
  const start = Date.now();

  // Secret key is REQUIRED — no fallback default
  if (!EXPORT_SECRET_KEY) {
    return NextResponse.json(
      {
        success: false,
        error:
          'EXPORT_SECRET_KEY environment variable is not set. ' +
          'Add it to your Vercel environment variables before using this endpoint.',
      },
      { status: 500 }
    );
  }

  const key = request.nextUrl.searchParams.get('key');
  if (key !== EXPORT_SECRET_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Provide ?key=YOUR_SECRET_KEY' },
      { status: 401 }
    );
  }

  // Support exporting a single table (to avoid Vercel size limits)
  const singleTable = request.nextUrl.searchParams.get('table');

  try {
    if (singleTable) {
      // Export just one table
      if (!TABLE_MODELS[singleTable]) {
        return NextResponse.json(
          {
            success: false,
            error: `Unknown table "${singleTable}". Supported: ${TABLE_NAMES.join(', ')}`,
          },
          { status: 400 }
        );
      }

      const model = TABLE_MODELS[singleTable]();
      const rows = await model.findMany();

      return NextResponse.json(
        {
          success: true,
          table: singleTable,
          count: rows.length,
          rows,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    }

    // Export all tables (may hit Vercel size limits with large datasets)
    const results = await Promise.all(
      TABLE_NAMES.map(async (name) => {
        const model = TABLE_MODELS[name]();
        const rows = await model.findMany();
        return { name, rows };
      })
    );

    const data: Record<string, unknown[]> = {};
    const rowCounts: Record<string, number> = {};
    let totalRows = 0;

    for (const { name, rows } of results) {
      data[name] = rows;
      rowCounts[name] = rows.length;
      totalRows += rows.length;
    }

    console.log(
      `📦 Data export complete: ${totalRows} rows in ${Date.now() - start}ms`
    );

    return NextResponse.json(
      {
        meta: {
          exportedAt: new Date().toISOString(),
          duration: Date.now() - start,
          rowCounts,
          totalRows,
        },
        tables: data,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error('Export failed:', error);
    return NextResponse.json(
      { success: false, error: 'Export failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
