import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const GRADE_LEVEL_LABELS: Record<string, string> = {
  GRADE_SCHOOL: 'Grade School',
  JUNIOR_HIGH: 'Junior High',
  SENIOR_HIGH: 'Senior High',
  COLLEGE: 'College',
};

const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];
const SCHOLARSHIP_TYPES = ['PAED', 'CHED', 'LGU'];

// GET /api/export/students - Export detailed student scholarship report
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format') || 'xlsx';

        // Fetch detailed student data with fees
        const students = await prisma.student.findMany({
            include: {
                scholarship: true,
                fees: true,
            },
            orderBy: [
                { gradeLevel: 'asc' },
                { lastName: 'asc' },
            ],
        });

        const calculateTotalFees = (fees: any) => {
            if (!fees) return 0;
            return Number(fees.tuitionFee) + Number(fees.otherFee) + 
                   Number(fees.miscellaneousFee) + Number(fees.laboratoryFee);
        };

        if (format === 'xlsx') {
            const wb = XLSX.utils.book_new();

            // Create a sheet for each grade level
            GRADE_LEVELS.forEach((gradeLevel) => {
                const gradeLevelStudents = students.filter(s => s.gradeLevel === gradeLevel);
                
                if (gradeLevelStudents.length === 0) return;

                const sheetData: any[] = [];
                
                // Add title
                sheetData.push([`${GRADE_LEVEL_LABELS[gradeLevel]} - Detailed Student Scholarship Report`]);
                sheetData.push([`Generated: ${new Date().toLocaleString()}`]);
                sheetData.push([]); // Empty row

                // Group by scholarship type
                SCHOLARSHIP_TYPES.forEach((scholarshipType) => {
                    const typeStudents = gradeLevelStudents.filter(
                        s => s.scholarship?.type === scholarshipType
                    );

                    if (typeStudents.length === 0) return;

                    // Add scholarship type header
                    sheetData.push([`${scholarshipType} Scholarship (${typeStudents.length} students)`]);
                    sheetData.push([]); // Empty row

                    // Add column headers
                    sheetData.push([
                        'Student No.',
                        'Last Name',
                        'First Name',
                        'M.I.',
                        'Year Level',
                        'Tuition Fee',
                        'Other Fees',
                        'Miscellaneous',
                        'Laboratory',
                        'Total Fees',
                        'Subsidy Amount',
                        '% Subsidy'
                    ]);

                    // Add student data
                    typeStudents.forEach((student) => {
                        const fees = student.fees[0];
                        const totalFees = fees ? calculateTotalFees(fees) : 0;

                        sheetData.push([
                            student.studentNo,
                            student.lastName,
                            student.firstName,
                            student.middleInitial || '-',
                            student.yearLevel,
                            fees ? Number(fees.tuitionFee) : 0,
                            fees ? Number(fees.otherFee) : 0,
                            fees ? Number(fees.miscellaneousFee) : 0,
                            fees ? Number(fees.laboratoryFee) : 0,
                            totalFees,
                            fees ? Number(fees.amountSubsidy) : 0,
                            fees ? `${Number(fees.percentSubsidy).toFixed(2)}%` : '0%'
                        ]);
                    });

                    // Add totals row
                    const totalTuition = typeStudents.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].tuitionFee) : 0), 0);
                    const totalOther = typeStudents.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].otherFee) : 0), 0);
                    const totalMisc = typeStudents.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].miscellaneousFee) : 0), 0);
                    const totalLab = typeStudents.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].laboratoryFee) : 0), 0);
                    const totalAllFees = typeStudents.reduce((sum, s) => sum + (s.fees[0] ? calculateTotalFees(s.fees[0]) : 0), 0);
                    const totalSubsidy = typeStudents.reduce((sum, s) => sum + (s.fees[0] ? Number(s.fees[0].amountSubsidy) : 0), 0);

                    sheetData.push([
                        '',
                        '',
                        '',
                        '',
                        'TOTAL:',
                        totalTuition,
                        totalOther,
                        totalMisc,
                        totalLab,
                        totalAllFees,
                        totalSubsidy,
                        ''
                    ]);

                    sheetData.push([]); // Empty row between scholarship types
                });

                const ws = XLSX.utils.aoa_to_sheet(sheetData);

                // Set column widths
                ws['!cols'] = [
                    { wch: 15 }, // Student No
                    { wch: 20 }, // Last Name
                    { wch: 20 }, // First Name
                    { wch: 8 },  // M.I.
                    { wch: 12 }, // Year Level
                    { wch: 15 }, // Tuition
                    { wch: 15 }, // Other Fees
                    { wch: 15 }, // Misc
                    { wch: 15 }, // Lab
                    { wch: 15 }, // Total Fees
                    { wch: 15 }, // Subsidy
                    { wch: 12 }, // % Subsidy
                ];

                XLSX.utils.book_append_sheet(wb, ws, GRADE_LEVEL_LABELS[gradeLevel]);
            });

            // Generate buffer
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': 'attachment; filename="detailed-student-scholarship-report.xlsx"',
                },
            });
        }

        if (format === 'csv') {
            const csvData: string[] = [];
            
            csvData.push('Detailed Student Scholarship Report');
            csvData.push(`Generated: ${new Date().toLocaleString()}`);
            csvData.push('');

            GRADE_LEVELS.forEach((gradeLevel) => {
                const gradeLevelStudents = students.filter(s => s.gradeLevel === gradeLevel);
                
                if (gradeLevelStudents.length === 0) return;

                csvData.push(`${GRADE_LEVEL_LABELS[gradeLevel]}`);
                csvData.push('');

                SCHOLARSHIP_TYPES.forEach((scholarshipType) => {
                    const typeStudents = gradeLevelStudents.filter(
                        s => s.scholarship?.type === scholarshipType
                    );

                    if (typeStudents.length === 0) return;

                    csvData.push(`${scholarshipType} Scholarship (${typeStudents.length} students)`);
                    csvData.push('');

                    // Headers
                    csvData.push([
                        'Student No.',
                        'Last Name',
                        'First Name',
                        'M.I.',
                        'Year Level',
                        'Tuition Fee',
                        'Other Fees',
                        'Miscellaneous',
                        'Laboratory',
                        'Total Fees',
                        'Subsidy Amount',
                        '% Subsidy'
                    ].map(h => `"${h}"`).join(','));

                    // Data rows
                    typeStudents.forEach((student) => {
                        const fees = student.fees[0];
                        const totalFees = fees ? calculateTotalFees(fees) : 0;

                        csvData.push([
                            student.studentNo,
                            student.lastName,
                            student.firstName,
                            student.middleInitial || '-',
                            student.yearLevel,
                            fees ? Number(fees.tuitionFee) : 0,
                            fees ? Number(fees.otherFee) : 0,
                            fees ? Number(fees.miscellaneousFee) : 0,
                            fees ? Number(fees.laboratoryFee) : 0,
                            totalFees,
                            fees ? Number(fees.amountSubsidy) : 0,
                            fees ? `${Number(fees.percentSubsidy).toFixed(2)}%` : '0%'
                        ].map(v => `"${v}"`).join(','));
                    });

                    csvData.push('');
                });

                csvData.push('');
            });

            return new NextResponse(csvData.join('\n'), {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="detailed-student-scholarship-report.csv"',
                },
            });
        }

        // Generate PDF
        const doc = new jsPDF('landscape');

        doc.setFontSize(16);
        doc.text('Detailed Student Scholarship Report', 14, 15);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);

        let startY = 30;

        GRADE_LEVELS.forEach((gradeLevel) => {
            const gradeLevelStudents = students.filter(s => s.gradeLevel === gradeLevel);
            
            if (gradeLevelStudents.length === 0) return;

            SCHOLARSHIP_TYPES.forEach((scholarshipType) => {
                const typeStudents = gradeLevelStudents.filter(
                    s => s.scholarship?.type === scholarshipType
                );

                if (typeStudents.length === 0) return;

                // Check if we need a new page
                if (startY > 180) {
                    doc.addPage();
                    startY = 20;
                }

                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text(`${GRADE_LEVEL_LABELS[gradeLevel]} - ${scholarshipType} Scholarship (${typeStudents.length} students)`, 14, startY);
                startY += 7;

                autoTable(doc, {
                    startY: startY,
                    head: [[
                        'Student No.',
                        'Last Name',
                        'First Name',
                        'M.I.',
                        'Year',
                        'Tuition',
                        'Other',
                        'Misc.',
                        'Lab',
                        'Total',
                        'Subsidy',
                        '%'
                    ]],
                    body: typeStudents.map((student) => {
                        const fees = student.fees[0];
                        const totalFees = fees ? calculateTotalFees(fees) : 0;

                        return [
                            student.studentNo,
                            student.lastName,
                            student.firstName,
                            student.middleInitial || '-',
                            student.yearLevel,
                            fees ? `₱${Number(fees.tuitionFee).toLocaleString()}` : '-',
                            fees ? `₱${Number(fees.otherFee).toLocaleString()}` : '-',
                            fees ? `₱${Number(fees.miscellaneousFee).toLocaleString()}` : '-',
                            fees ? `₱${Number(fees.laboratoryFee).toLocaleString()}` : '-',
                            `₱${totalFees.toLocaleString()}`,
                            fees ? `₱${Number(fees.amountSubsidy).toLocaleString()}` : '-',
                            fees ? `${Number(fees.percentSubsidy).toFixed(2)}%` : '-'
                        ];
                    }),
                    styles: { fontSize: 7 },
                    headStyles: { fillColor: [147, 168, 126], textColor: [255, 255, 255] },
                    columnStyles: {
                        5: { halign: 'right' },
                        6: { halign: 'right' },
                        7: { halign: 'right' },
                        8: { halign: 'right' },
                        9: { halign: 'right', fontStyle: 'bold' },
                        10: { halign: 'right', fontStyle: 'bold' },
                        11: { halign: 'right' },
                    },
                    didDrawPage: (data) => {
                        startY = data.cursor?.y || startY;
                    }
                });

                startY += 10;
            });
        });

        const pdfBuffer = doc.output('arraybuffer');

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': 'attachment; filename="detailed-student-scholarship-report.pdf"',
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