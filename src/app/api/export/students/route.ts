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
                applications: {
                    include: {
                        scholarship: true,
                    },
                },
            },
            orderBy: { fullName: 'asc' },
        });

        if (format === 'csv') {
            const headers = [
                'ID',
                'Student No',
                'Full Name',
                'Program',
                'Year Level',
                'Email',
                'Status',
                'Scholarships',
            ];

            const rows = students.map((s) => [
                s.id,
                s.studentNo,
                s.fullName,
                s.program,
                s.yearLevel,
                s.email,
                s.status,
                s.applications.map((a) => a.scholarship.scholarshipName).join('; '),
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
            head: [['Student No', 'Name', 'Program', 'Year', 'Email', 'Status']],
            body: students.map((s) => [
                s.studentNo,
                s.fullName,
                s.program,
                s.yearLevel,
                s.email,
                s.status,
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
