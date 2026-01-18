import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// GET /api/export/scholarships - Export scholarships to PDF
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format') || 'pdf';

        const scholarships = await prisma.scholarship.findMany({
            include: {
                _count: {
                    select: { students: true },
                },
            },
            orderBy: { scholarshipName: 'asc' },
        });

        if (format === 'csv') {
            const headers = [
                'ID',
                'Name',
                'Sponsor',
                'Type',
                'Amount',
                'Requirements',
                'Status',
                'Students',
            ];

            const rows = scholarships.map((s) => [
                s.id,
                s.scholarshipName,
                s.sponsor,
                s.type,
                Number(s.amount),
                s.requirements || '',
                s.status,
                s._count.students,
            ]);

            const csv = [headers, ...rows]
                .map((row) =>
                    row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
                )
                .join('\n');

            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="scholarships.csv"',
                },
            });
        }

        // Generate PDF
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text('Scholarship Programs', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        const totalAmount = scholarships.reduce((sum, s) => sum + Number(s.amount), 0);
        const activeCount = scholarships.filter((s) => s.status === 'Active').length;
        doc.text(`Total Programs: ${scholarships.length} | Active: ${activeCount} | Total Amount: ₱${totalAmount.toLocaleString()}`, 14, 38);

        autoTable(doc, {
            startY: 45,
            head: [['Name', 'Sponsor', 'Type', 'Amount', 'Status', 'Students']],
            body: scholarships.map((s) => [
                s.scholarshipName,
                s.sponsor,
                s.type,
                `₱${Number(s.amount).toLocaleString()}`,
                s.status,
                s._count.students.toString(),
            ]),
            styles: { fontSize: 8 },
            headStyles: { fillColor: [34, 197, 94] },
        });

        const pdfBuffer = doc.output('arraybuffer');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="scholarships.pdf"',
            },
        });
    } catch (error) {
        console.error('Error exporting scholarships:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to export scholarships' },
            { status: 500 }
        );
    }
}