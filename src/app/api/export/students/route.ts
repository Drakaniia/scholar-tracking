import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// GET /api/export/students - Export students to PDF
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format') || 'pdf';

        const students = await prisma.student.findMany({
            include: {
                scholarship: true,
            },
            orderBy: { lastName: 'asc' },
        });

        if (format === 'csv') {
            const headers = [
                'ID',
                'Student No',
                'Last Name',
                'First Name',
                'Middle Initial',
                'Program',
                'Grade Level',
                'Year Level',
                'Status',
                'Scholarship',
            ];

            const rows = students.map((s) => [
                s.id,
                s.studentNo,
                s.lastName,
                s.firstName,
                s.middleInitial || '',
                s.program,
                s.gradeLevel,
                s.yearLevel,
                s.status,
                s.scholarship?.scholarshipName || '',
            ]);

            const csv = [headers, ...rows]
                .map((row) =>
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                )
                .join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="students.csv"',
                },
            });
        }

        // Generate PDF
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Student Records', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        autoTable(doc, {
            startY: 35,
            head: [['Student No', 'Name', 'Program', 'Grade Level', 'Year Level', 'Status', 'Scholarship']],
            body: students.map((s) => [
                s.studentNo,
                `${s.lastName}, ${s.firstName} ${s.middleInitial || ''}`.trim(),
                s.program,
                s.gradeLevel,
                s.yearLevel,
                s.status,
                s.scholarship?.scholarshipName || 'None',
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
        });

        const pdfBuffer = doc.output('arraybuffer');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="students.pdf"',
            },
        });
    } catch (error) {
        console.error('Error exporting students:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to export students' },
            { status: 500 }
        );
    }
}