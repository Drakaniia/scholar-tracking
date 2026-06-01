import { NextRequest, NextResponse } from 'next/server';

import { Prisma } from '@prisma/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import prisma from '@/lib/prisma';

const GRADE_LEVEL_LABELS: Record<string, string> = {
  GRADE_SCHOOL: 'Grade School',
  JUNIOR_HIGH: 'Junior High',
  SENIOR_HIGH: 'Senior High',
  COLLEGE: 'College',
};

const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];
const NO_SCHOLARSHIP = 'No Scholarship';
const SCHOLARSHIP_ACRONYMS = new Set([
  'CHED',
  'CMSP',
  'ESC',
  'LGU',
  'OLSSEF',
  'PAEB',
  'TDP',
  'TES',
  'UTFI',
]);

type DecimalLike = Prisma.Decimal | number | string | null | undefined;

type FeeRecord = {
  tuitionFee: DecimalLike;
  otherFee: DecimalLike;
  miscellaneousFee: DecimalLike;
  laboratoryFee: DecimalLike;
  amountSubsidy: DecimalLike;
  term: string;
  academicYear: string | null;
};

type ScholarshipAssignment = {
  scholarship: {
    scholarshipName: string;
    type: string;
    source: string;
  } | null;
};

type StudentReportRecord = {
  id: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  gradeLevel: string;
  yearLevel: string;
  scholarships: ScholarshipAssignment[];
  fees: FeeRecord[];
};

type AggregatedFees = {
  tuitionFee: number;
  otherFee: number;
  miscellaneousFee: number;
  laboratoryFee: number;
  amountSubsidy: number;
  semesterCount: number;
  academicYear: string;
};

function toNumber(value: DecimalLike) {
  return Number(value ?? 0);
}

function formatGeneratedAt(date = new Date()) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    dateStyle: 'medium',
    timeStyle: 'medium',
    hour12: true,
  }).format(date);
}

function formatScholarshipType(type: string) {
  if (type === NO_SCHOLARSHIP) return NO_SCHOLARSHIP;
  return type
    .split('_')
    .map((part) =>
      SCHOLARSHIP_ACRONYMS.has(part) ? part : `${part[0]}${part.slice(1).toLowerCase()}`
    )
    .join(' ');
}

function aggregateFeesByAcademicYear(fees: FeeRecord[]): AggregatedFees | null {
  if (!fees || fees.length === 0) return null;

  const feesByYear: Record<string, AggregatedFees> = {};

  fees.forEach((fee) => {
    const year = fee.academicYear || 'Unknown';
    if (!feesByYear[year]) {
      feesByYear[year] = {
        tuitionFee: 0,
        otherFee: 0,
        miscellaneousFee: 0,
        laboratoryFee: 0,
        amountSubsidy: 0,
        semesterCount: 0,
        academicYear: year,
      };
    }

    feesByYear[year].tuitionFee += toNumber(fee.tuitionFee);
    feesByYear[year].otherFee += toNumber(fee.otherFee);
    feesByYear[year].miscellaneousFee += toNumber(fee.miscellaneousFee);
    feesByYear[year].laboratoryFee += toNumber(fee.laboratoryFee);
    feesByYear[year].amountSubsidy += toNumber(fee.amountSubsidy);
    feesByYear[year].semesterCount += 1;
  });

  const [mostRecentYear] = Object.keys(feesByYear).sort().reverse();
  return feesByYear[mostRecentYear];
}

function calculateTotalFees(fees: AggregatedFees | null) {
  if (!fees) return 0;
  return fees.tuitionFee + fees.otherFee + fees.miscellaneousFee + fees.laboratoryFee;
}

function calculateFse(fees: AggregatedFees | null) {
  const totalFees = calculateTotalFees(fees);
  return fees && totalFees > 0 ? Number((fees.amountSubsidy / totalFees).toFixed(4)) : 0;
}

function getAssignments(student: StudentReportRecord) {
  return (student.scholarships || []).filter((ss) => ss.scholarship);
}

function getScholarshipTypesForGrade(students: StudentReportRecord[]) {
  const types = new Set<string>();

  students.forEach((student) => {
    const assignments = getAssignments(student);
    if (assignments.length === 0) {
      types.add(NO_SCHOLARSHIP);
      return;
    }

    assignments.forEach((ss) => {
      if (ss.scholarship?.type) {
        types.add(ss.scholarship.type);
      }
    });
  });

  return Array.from(types).sort((a, b) => {
    if (a === NO_SCHOLARSHIP) return 1;
    if (b === NO_SCHOLARSHIP) return -1;
    return formatScholarshipType(a).localeCompare(formatScholarshipType(b));
  });
}

function getStudentsForScholarshipType(students: StudentReportRecord[], scholarshipType: string) {
  if (scholarshipType === NO_SCHOLARSHIP) {
    return students.filter((student) => getAssignments(student).length === 0);
  }

  return students.filter((student) =>
    getAssignments(student).some((ss) => ss.scholarship?.type === scholarshipType)
  );
}

function getScholarshipNames(student: StudentReportRecord, scholarshipType: string) {
  if (scholarshipType === NO_SCHOLARSHIP) return NO_SCHOLARSHIP;

  return getAssignments(student)
    .filter((ss) => ss.scholarship?.type === scholarshipType)
    .map((ss) => ss.scholarship?.scholarshipName)
    .filter(Boolean)
    .join(', ');
}

function getScholarshipNamesForGroup(students: StudentReportRecord[], scholarshipType: string) {
  if (scholarshipType === NO_SCHOLARSHIP) return [];

  return Array.from(
    new Set(
      students
        .flatMap((student) => getAssignments(student))
        .filter((ss) => ss.scholarship?.type === scholarshipType)
        .map((ss) => ss.scholarship?.scholarshipName)
        .filter(Boolean)
    )
  ).sort();
}

function buildStudentRow(student: StudentReportRecord, scholarshipType: string) {
  const fees = aggregateFeesByAcademicYear(student.fees);
  const totalFees = calculateTotalFees(fees);
  const fse = calculateFse(fees);

  return [
    student.lastName,
    student.firstName,
    student.middleInitial || '-',
    student.yearLevel,
    getScholarshipNames(student, scholarshipType),
    fees ? fees.tuitionFee : 0,
    fees ? fees.otherFee : 0,
    fees ? fees.miscellaneousFee : 0,
    fees ? fees.laboratoryFee : 0,
    totalFees,
    fees ? fees.amountSubsidy : 0,
    fse.toFixed(2),
    1,
    fse.toFixed(2),
  ];
}

function csvEscape(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

// GET /api/export/students - Export detailed student scholarship report
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'xlsx';
    const sourceParam = (searchParams.get('source') || '').toUpperCase();
    const sourceFilter = ['INTERNAL', 'EXTERNAL'].includes(sourceParam) ? sourceParam : '';
    const generatedAt = formatGeneratedAt();

    const whereClause: Prisma.StudentWhereInput = {
      isArchived: false,
      status: 'Active',
    };

    if (sourceFilter) {
      whereClause.scholarships = {
        some: {
          scholarship: {
            source: sourceFilter,
          },
        },
      };
    }

    const students = (await prisma.student.findMany({
      where: whereClause,
      include: {
        scholarships: sourceFilter
          ? {
              where: {
                scholarship: {
                  source: sourceFilter,
                },
              },
              include: {
                scholarship: true,
              },
            }
          : {
              include: {
                scholarship: true,
              },
            },
        fees: {
          orderBy: [{ academicYear: 'desc' }, { term: 'asc' }],
        },
      },
      orderBy: [{ gradeLevel: 'asc' }, { lastName: 'asc' }, { firstName: 'asc' }],
    })) as unknown as StudentReportRecord[];

    const headers = [
      'Last Name',
      'First Name',
      'M.I.',
      'Year Level',
      'Scholarships',
      'Tuition Fee',
      'Other Fees',
      'Miscellaneous',
      'Laboratory',
      'Total Fees',
      'Amount Subsidy',
      '% Subsidy',
      'No. of Students',
      'FSE',
    ];

    if (format === 'xlsx') {
      const wb = XLSX.utils.book_new();

      GRADE_LEVELS.forEach((gradeLevel) => {
        const gradeLevelStudents = students.filter((s) => s.gradeLevel === gradeLevel);

        if (gradeLevelStudents.length === 0) return;

        const sheetData: (string | number)[][] = [];

        sheetData.push([`${GRADE_LEVEL_LABELS[gradeLevel]} - Detailed Student Scholarship Report`]);
        sheetData.push([`Generated: ${generatedAt}`]);
        sheetData.push([]);

        getScholarshipTypesForGrade(gradeLevelStudents).forEach((scholarshipType) => {
          const typeStudents = getStudentsForScholarshipType(gradeLevelStudents, scholarshipType);

          if (typeStudents.length === 0) return;

          const scholarshipNames = getScholarshipNamesForGroup(typeStudents, scholarshipType);
          const groupLabel = formatScholarshipType(scholarshipType);

          sheetData.push([`${groupLabel} (${typeStudents.length} students)`]);
          if (scholarshipNames.length > 0) {
            sheetData.push([scholarshipNames.join(', ')]);
          }
          sheetData.push([]);
          sheetData.push(headers);

          typeStudents.forEach((student) => {
            sheetData.push(buildStudentRow(student, scholarshipType));
          });

          const totals = typeStudents.reduce(
            (sum, student) => {
              const fees = aggregateFeesByAcademicYear(student.fees);
              sum.tuition += fees ? fees.tuitionFee : 0;
              sum.other += fees ? fees.otherFee : 0;
              sum.misc += fees ? fees.miscellaneousFee : 0;
              sum.lab += fees ? fees.laboratoryFee : 0;
              sum.total += calculateTotalFees(fees);
              sum.subsidy += fees ? fees.amountSubsidy : 0;
              sum.fse += calculateFse(fees);
              return sum;
            },
            { tuition: 0, other: 0, misc: 0, lab: 0, total: 0, subsidy: 0, fse: 0 }
          );

          sheetData.push([
            '',
            '',
            '',
            '',
            'TOTAL:',
            totals.tuition,
            totals.other,
            totals.misc,
            totals.lab,
            totals.total,
            totals.subsidy,
            '',
            typeStudents.length,
            totals.fse.toFixed(2),
          ]);

          sheetData.push([]);
        });

        const ws = XLSX.utils.aoa_to_sheet(sheetData);
        ws['!cols'] = [
          { wch: 18 },
          { wch: 18 },
          { wch: 8 },
          { wch: 14 },
          { wch: 44 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
          { wch: 14 },
          { wch: 16 },
          { wch: 12 },
          { wch: 14 },
          { wch: 10 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, GRADE_LEVEL_LABELS[gradeLevel]);
      });

      if (wb.SheetNames.length === 0) {
        const ws = XLSX.utils.aoa_to_sheet([
          ['Detailed Student Scholarship Report'],
          [`Generated: ${generatedAt}`],
          [],
          ['No records found.'],
        ]);
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
      }

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
      csvData.push(`Generated: ${generatedAt}`);
      csvData.push('');

      GRADE_LEVELS.forEach((gradeLevel) => {
        const gradeLevelStudents = students.filter((s) => s.gradeLevel === gradeLevel);

        if (gradeLevelStudents.length === 0) return;

        csvData.push(GRADE_LEVEL_LABELS[gradeLevel]);
        csvData.push('');

        getScholarshipTypesForGrade(gradeLevelStudents).forEach((scholarshipType) => {
          const typeStudents = getStudentsForScholarshipType(gradeLevelStudents, scholarshipType);

          if (typeStudents.length === 0) return;

          const scholarshipNames = getScholarshipNamesForGroup(typeStudents, scholarshipType);
          csvData.push(
            `${formatScholarshipType(scholarshipType)} (${typeStudents.length} students)`
          );
          if (scholarshipNames.length > 0) {
            csvData.push(scholarshipNames.join(', '));
          }
          csvData.push('');
          csvData.push(headers.map(csvEscape).join(','));

          typeStudents.forEach((student) => {
            csvData.push(buildStudentRow(student, scholarshipType).map(csvEscape).join(','));
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

    const doc = new jsPDF('landscape');

    doc.setFontSize(16);
    doc.text('Detailed Student Scholarship Report', 14, 15);
    doc.setFontSize(9);
    doc.text(`Generated: ${generatedAt}`, 14, 22);

    let startY = 30;

    GRADE_LEVELS.forEach((gradeLevel) => {
      const gradeLevelStudents = students.filter((s) => s.gradeLevel === gradeLevel);

      if (gradeLevelStudents.length === 0) return;

      getScholarshipTypesForGrade(gradeLevelStudents).forEach((scholarshipType) => {
        const typeStudents = getStudentsForScholarshipType(gradeLevelStudents, scholarshipType);

        if (typeStudents.length === 0) return;

        if (startY > 180) {
          doc.addPage();
          startY = 20;
        }

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(
          `${GRADE_LEVEL_LABELS[gradeLevel]} - ${formatScholarshipType(scholarshipType)} (${typeStudents.length} students)`,
          14,
          startY
        );
        startY += 7;

        const scholarshipNames = getScholarshipNamesForGroup(typeStudents, scholarshipType);
        if (scholarshipNames.length > 0) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
          doc.text(scholarshipNames.join(', '), 14, startY, { maxWidth: 260 });
          startY += 6;
        }

        autoTable(doc, {
          startY,
          head: [
            [
              'Last Name',
              'First Name',
              'M.I.',
              'Year',
              'Scholarships',
              'Tuition',
              'Other',
              'Misc.',
              'Lab',
              'Total',
              'Subsidy',
              '%',
              'No.',
              'FSE',
            ],
          ],
          body: typeStudents.map((student) => buildStudentRow(student, scholarshipType)),
          styles: { fontSize: 6 },
          headStyles: { fillColor: [147, 168, 126], textColor: [255, 255, 255] },
          columnStyles: {
            5: { halign: 'right' },
            6: { halign: 'right' },
            7: { halign: 'right' },
            8: { halign: 'right' },
            9: { halign: 'right', fontStyle: 'bold' },
            10: { halign: 'right', fontStyle: 'bold' },
            11: { halign: 'right' },
            12: { halign: 'right' },
            13: { halign: 'right' },
          },
          didDrawPage: (data) => {
            startY = data.cursor?.y || startY;
          },
        });

        startY += 10;
      });
    });

    if (students.length === 0) {
      doc.setFontSize(11);
      doc.text('No records found.', 14, 35);
    }

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
