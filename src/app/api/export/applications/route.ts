import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// GET /api/export/applications - Export applications to PDF
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format') || 'pdf';
        const status = searchParams.get('status') || '';

        const where = status ? { status } : {};

        const applications = await prisma.application.findMany({
            where,
            include: {
                student: true,
                scholarship: true,
                award: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        if (format === 'csv') {
            const headers = [
                'ID',
                'Student Name',
                'Program',
                'Scholarship',
                'Type',
                'Amount',
                'Status',
                'Application Date',
                'Remarks',
            ];

            const rows = applications.map((a) => [
                a.id,
                a.student.fullName,
                a.student.program,
                a.scholarship.scholarshipName,
                a.scholarship.type,
                Number(a.scholarship.amount),
                a.status,
                a.applicationDate.toISOString().split('T')[0],
                a.remarks || '',
            ]);

            const csv = [headers, ...rows]
                .map((row) =>
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                )
                .join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="applications.csv"',
                },
            });
        }

        // Generate PDF
        const doc = new jsPDF('landscape');

        doc.setFontSize(18);
        doc.text('Scholarship Applications Report', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        const pending = applications.filter((a) => a.status === 'Pending').length;
        const approved = applications.filter((a) => a.status === 'Approved').length;
        const rejected = applications.filter((a) => a.status === 'Rejected').length;
        const totalAwarded = applications
            .filter((a) => a.status === 'Approved')
            .reduce((sum, a) => sum + Number(a.scholarship.amount), 0);

        doc.text(
            `Total: ${applications.length} | Pending: ${pending} | Approved: ${approved} | Rejected: ${rejected} | Total Awarded: ₱${totalAwarded.toLocaleString()}`,
            14,
            38
        );

        autoTable(doc, {
            startY: 45,
            head: [
                ['Student', 'Program', 'Scholarship', 'Type', 'Amount', 'Status', 'Date'],
            ],
            body: applications.map((a) => [
                a.student.fullName,
                a.student.program,
                a.scholarship.scholarshipName,
                a.scholarship.type,
                `₱${Number(a.scholarship.amount).toLocaleString()}`,
                a.status,
                a.applicationDate.toLocaleDateString(),
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [168, 85, 247] },
        });

        const pdfBuffer = doc.output('arraybuffer');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="applications.pdf"',
            },
        });
    } catch (error) {
        console.error('Error exporting applications:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to export applications' },
            { status: 500 }
        );
    }
}
