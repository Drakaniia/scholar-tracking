import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GradeLevel } from '@/types';
import { getSession } from '@/lib/auth';

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

        const body = await req.json();
        const { validStudents } = body;

        if (!validStudents || !Array.isArray(validStudents)) {
            return NextResponse.json(
                { success: false, error: 'No valid students data provided' },
                { status: 400 }
            );
        }

        // Import valid students
        let imported = 0;
        if (validStudents.length > 0) {
            const createData = validStudents.map((student: ImportRow) => ({
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
                imported,
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
