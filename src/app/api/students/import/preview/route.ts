import { NextRequest, NextResponse } from 'next/server';

import * as XLSX from 'xlsx';

import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { GRADE_LEVELS, GradeLevel } from '@/types';

const VALID_STATUSES = ['Active', 'Inactive', 'Graduated', 'Withdrawn'];
const MAX_ROWS = 1000;

// Column name mappings for auto-detection
const COLUMN_MAPPINGS = {
  firstName: ['firstname', 'first_name', 'fname', 'first', 'givenname', 'given_name', 'given'],
  lastName: [
    'lastname',
    'last_name',
    'lname',
    'last',
    'surname',
    'familyname',
    'family_name',
    'family',
  ],
  middleInitial: [
    'middleinitial',
    'middle_initial',
    'mi',
    'middleinitial',
    'middlename',
    'middle_name',
  ],
  program: ['program', 'course', 'major', 'strand', 'specialization', 'specialization'],
  gradeLevel: ['gradelevel', 'grade_level', 'grade', 'yeargrade', 'year_grade'],
  yearLevel: ['yearlevel', 'year_level', 'year', 'yearnum', 'year_num', 'level'],
  status: [
    'status',
    'studentstatus',
    'student_status',
    'enrollmentstatus',
    'enrollment_status',
    'state',
  ],
  birthDate: ['birthdate', 'birth_date', 'dob', 'dateofbirth', 'date_of_birth', 'birthday'],
};

interface ImportRow {
  firstName: string;
  lastName: string;
  middleInitial?: string;
  program: string;
  gradeLevel: string;
  yearLevel: string;
  status: string;
  birthDate?: string;
  [key: string]: string | undefined;
}

interface ImportError {
  row: number;
  data: ImportRow;
  errors: string[];
}

// Auto-detect and normalize column names
function normalizeColumns(row: Record<string, unknown>): Partial<ImportRow> {
  const normalized: Record<string, unknown> = {};
  const lowerCaseKeys = Object.keys(row).map((key) => ({
    original: key,
    lower: key.toLowerCase().replace(/[\s_-]/g, ''),
  }));

  for (const [standardField, variations] of Object.entries(COLUMN_MAPPINGS)) {
    const found = lowerCaseKeys.find((k) =>
      variations.some((v) => k.lower === v.toLowerCase().replace(/[\s_-]/g, ''))
    );

    if (found) {
      normalized[standardField] = row[found.original];
    }
  }

  return normalized as Partial<ImportRow>;
}

export async function POST(req: NextRequest) {
  try {
    // Verify admin access
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Read file
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json<ImportRow>(worksheet);

    if (data.length === 0) {
      return NextResponse.json({ success: false, error: 'File is empty' }, { status: 400 });
    }

    if (data.length > MAX_ROWS) {
      return NextResponse.json(
        { success: false, error: `Maximum ${MAX_ROWS} rows allowed` },
        { status: 400 }
      );
    }

    const errors: ImportError[] = [];
    const validStudents: ImportRow[] = [];

    // Validate each row
    data.forEach((row, index) => {
      const rowNumber = index + 2; // +2 for header and 0-index

      // Normalize column names
      const normalizedRow = normalizeColumns(row);
      const rowErrors: string[] = [];

      // Required fields
      if (!normalizedRow.firstName?.trim()) rowErrors.push('firstName is required');
      if (!normalizedRow.lastName?.trim()) rowErrors.push('lastName is required');
      if (!normalizedRow.program?.trim()) rowErrors.push('program is required');
      if (!normalizedRow.gradeLevel?.trim()) rowErrors.push('gradeLevel is required');
      if (!normalizedRow.yearLevel?.trim()) rowErrors.push('yearLevel is required');
      if (!normalizedRow.status?.trim()) rowErrors.push('status is required');

      // Validate gradeLevel
      const gradeLevel = normalizedRow.gradeLevel?.toString() || '';
      if (gradeLevel && !GRADE_LEVELS.includes(gradeLevel as GradeLevel)) {
        rowErrors.push(`Invalid gradeLevel. Must be one of: ${GRADE_LEVELS.join(', ')}`);
      }

      // Validate status
      const status = normalizedRow.status?.toString() || '';
      if (status && !VALID_STATUSES.includes(status)) {
        rowErrors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      // Validate birthDate if provided
      if (normalizedRow.birthDate) {
        const date = new Date(normalizedRow.birthDate.toString());
        if (isNaN(date.getTime())) {
          rowErrors.push('Invalid birthDate format. Use YYYY-MM-DD');
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, data: normalizedRow as ImportRow, errors: rowErrors });
      } else {
        validStudents.push(normalizedRow as ImportRow);
      }
    });

    // Check for duplicates in database
    const duplicateChecks = await Promise.all(
      validStudents.map(async (student, index) => {
        const existing = await prisma.student.findFirst({
          where: {
            firstName: student.firstName.trim().toUpperCase(),
            lastName: student.lastName.trim().toUpperCase(),
            program: student.program.trim(),
          },
        });
        return { index, existing, student };
      })
    );

    const duplicates = duplicateChecks.filter((check) => check.existing);
    duplicates.forEach(({ student }) => {
      const rowNumber = data.indexOf(student) + 2;
      errors.push({
        row: rowNumber,
        data: student,
        errors: ['Student already exists with same name and program'],
      });
    });

    // Filter out duplicates from valid students
    const finalValidStudents = validStudents.filter(
      (_, index) => !duplicates.some((dup) => dup.index === index)
    );

    // Store valid students in session for actual import
    // In production, you might want to use Redis or a temporary table
    return NextResponse.json({
      success: true,
      data: {
        total: data.length,
        valid: finalValidStudents.length,
        invalid: errors.length,
        validStudents: finalValidStudents,
        errors: errors,
      },
    });
  } catch (error) {
    console.error('Preview error:', error);
    return NextResponse.json({ success: false, error: 'Preview failed' }, { status: 500 });
  }
}
