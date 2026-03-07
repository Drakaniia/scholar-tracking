import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { prisma } from '@/lib/prisma';
import { GRADE_LEVELS, GradeLevel } from '@/types';
import { getSession } from '@/lib/auth';

const VALID_STATUSES = ['Active', 'Inactive', 'Graduated', 'Withdrawn'];
const MAX_ROWS = 1000;

interface ImportRow {
    firstName: string;
    lastName: string;
    middleInitial?: string;
    program: string;
    gradeLevel: string;
    yearLevel: string;
    status: string;
    birthDate?: string;
}

interface ImportError {
    row: number;
    data: ImportRow;
    errors: string[];
}

export async function POST(req: NextRequest) {
    try {
        // Verify admin access
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'No file provided' },
                { status: 400 }
            );
        }

        // Read file
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json<ImportRow>(worksheet);

        if (data.length === 0) {
            return NextResponse.json(
                { success: false, error: 'File is empty' },
                { status: 400 }
            );
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
            const rowErrors: string[] = [];
            const rowNumber = index + 2; // +2 for header and 0-index

            // Required fields
            if (!row.firstName?.trim()) rowErrors.push('firstName is required');
            if (!row.lastName?.trim()) rowErrors.push('lastName is required');
            if (!row.program?.trim()) rowErrors.push('program is required');
            if (!row.gradeLevel?.trim()) rowErrors.push('gradeLevel is required');
            if (!row.yearLevel?.trim()) rowErrors.push('yearLevel is required');
            if (!row.status?.trim()) rowErrors.push('status is required');

            // Validate gradeLevel
            if (row.gradeLevel && !GRADE_LEVELS.includes(row.gradeLevel as GradeLevel)) {
                rowErrors.push(`Invalid gradeLevel. Must be one of: ${GRADE_LEVELS.join(', ')}`);
            }

            // Validate status
            if (row.status && !VALID_STATUSES.includes(row.status)) {
                rowErrors.push(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
            }

            // Validate birthDate if provided
            if (row.birthDate) {
                const date = new Date(row.birthDate);
                if (isNaN(date.getTime())) {
                    rowErrors.push('Invalid birthDate format. Use YYYY-MM-DD');
                }
            }

            if (rowErrors.length > 0) {
                errors.push({ row: rowNumber, data: row, errors: rowErrors });
            } else {
                validStudents.push(row);
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

        const duplicates = duplicateChecks.filter(check => check.existing);
        duplicates.forEach(({ student }) => {
            const rowNumber = data.indexOf(student) + 2;
            errors.push({
                row: rowNumber,
                data: student,
                errors: ['Student already exists with same name and program'],
            });
        });

        // Filter out duplicates from valid students
        const studentsToImport = validStudents.filter((_, index) => 
            !duplicates.some(dup => dup.index === index)
        );

        // Import valid students
        let imported = 0;
        if (studentsToImport.length > 0) {
            const createData = studentsToImport.map(student => ({
                firstName: student.firstName.trim().toUpperCase(),
                lastName: student.lastName.trim().toUpperCase(),
                middleInitial: student.middleInitial?.trim().toUpperCase() || null,
                program: student.program.trim(),
                gradeLevel: student.gradeLevel as GradeLevel,
                yearLevel: student.yearLevel.trim(),
                status: student.status,
                birthDate: student.birthDate ? new Date(student.birthDate) : null,
            }));

            const result = await prisma.student.createMany({
                data: createData,
                skipDuplicates: true,
            });

            imported = result.count;
        }

        return NextResponse.json({
            success: true,
            data: {
                total: data.length,
                imported,
                failed: errors.length,
                errors: errors.slice(0, 50), // Limit error details
            },
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json(
            { success: false, error: 'Import failed' },
            { status: 500 }
        );
    }
}
