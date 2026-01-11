import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserFromRequest, hasRole } from '@/lib/auth';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// GET /api/admin/export/students - Export students to PDF
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUserFromRequest(request);

        if (!user || !hasRole(user, ['admin', 'staff'])) {
            return NextResponse.json(
                { success: false, error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format') || 'pdf';

        const students = await prisma.student.findMany({
            include: {
                scholarships: {
                    include: {
                        scholarship: true,
                    },
                },
            },
            orderBy: { lastName: 'asc' },
        });

        if (format === 'csv') {
            // Generate CSV
            const headers = [
                'ID',
                'First Name',
                'Middle Name',
                'Last Name',
                'Education Level',
                'Year Level',
                'Course',
                'Tuition Fee',
                'Scholarships',
            ];

            const rows = students.map((s) => [
                s.id,
                s.firstName,
                s.middleName || '',
                s.lastName,
                s.educationLevel,
                s.yearLevel,
                s.course,
                s.tuitionFee,
                s.scholarships.map((ss) => ss.scholarship.name).join('; '),
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

        // Title
        doc.setFontSize(18);
        doc.text('Student Records', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        // Table
        autoTable(doc, {
            startY: 35,
            head: [['Name', 'Education', 'Year', 'Course', 'Tuition', 'Scholarships']],
            body: students.map((s) => [
                `${s.lastName}, ${s.firstName}${s.middleName ? ` ${s.middleName}` : ''}`,
                s.educationLevel,
                s.yearLevel,
                s.course,
                `₱${s.tuitionFee.toLocaleString()}`,
                s.scholarships.length > 0
                    ? s.scholarships.map((ss) => ss.scholarship.name).join(', ')
                    : 'None',
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
