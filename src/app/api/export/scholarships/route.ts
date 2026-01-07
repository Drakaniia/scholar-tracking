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
            orderBy: { name: 'asc' },
        });

        if (format === 'csv') {
            // Generate CSV
            const headers = [
                'ID',
                'Name',
                'Type',
                'Category',
                'Amount',
                'Status',
                'Start Date',
                'End Date',
                'Recipients',
            ];

            const rows = scholarships.map((s) => [
                s.id,
                s.name,
                s.type,
                s.category || '',
                s.amount,
                s.isActive ? 'Active' : 'Inactive',
                s.applicationStart?.toISOString().split('T')[0] || '',
                s.applicationEnd?.toISOString().split('T')[0] || '',
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

        // Title
        doc.setFontSize(18);
        doc.text('Scholarship Programs', 14, 22);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

        // Summary
        const totalAmount = scholarships.reduce((sum, s) => sum + s.amount, 0);
        const activeCount = scholarships.filter((s) => s.isActive).length;
        doc.text(`Total Programs: ${scholarships.length} | Active: ${activeCount} | Total Amount: ₱${totalAmount.toLocaleString()}`, 14, 38);

        // Table
        autoTable(doc, {
            startY: 45,
            head: [['Name', 'Type', 'Amount', 'Status', 'Period', 'Recipients']],
            body: scholarships.map((s) => [
                s.name,
                s.type + (s.category ? ` (${s.category})` : ''),
                `₱${s.amount.toLocaleString()}`,
                s.isActive ? 'Active' : 'Inactive',
                s.applicationStart && s.applicationEnd
                    ? `${s.applicationStart.toLocaleDateString()} - ${s.applicationEnd.toLocaleDateString()}`
                    : 'Open',
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
