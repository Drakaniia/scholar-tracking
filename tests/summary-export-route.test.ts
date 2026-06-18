import { NextRequest } from 'next/server';

import ExcelJS from 'exceljs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadWorkbookFromBuffer } from '@/lib/excel';

const prismaMock = vi.hoisted(() => ({
  academicYear: {
    findMany: vi.fn(),
  },
  scholarship: {
    findMany: vi.fn(),
  },
  studentFees: {
    findMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

function fillRgb(cell: ExcelJS.Cell) {
  const fill = cell.fill;
  if (fill?.type !== 'pattern') return undefined;
  return fill.fgColor?.argb?.slice(-6);
}

describe('summary export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the sample-style summary workbook as XLSX', async () => {
    prismaMock.studentFees.findMany.mockResolvedValueOnce([
      {
        studentId: 1,
        academicYear: '2024-2025',
        student: { gradeLevel: 'GRADE_SCHOOL' },
      },
    ]);
    prismaMock.academicYear.findMany.mockResolvedValueOnce([
      { year: '2022-2023' },
      { year: '2023-2024' },
      { year: '2024-2025' },
    ]);
    prismaMock.scholarship.findMany.mockResolvedValueOnce([
      {
        id: 1,
        scholarshipName: 'Employees Ward (BED/SHS)',
        source: 'INTERNAL',
        type: 'EMPLOYEES_WARD',
        eligibleGradeLevels: 'GRADE_SCHOOL,JUNIOR_HIGH,SENIOR_HIGH',
        grantType: 'FULL',
        amount: 5000,
        amountSubsidy: 1000,
        tuitionFee: 0,
        miscellaneousFee: 0,
        laboratoryFee: 0,
        otherFee: 0,
        otherFeeName: null,
        coversTuition: false,
        coversMiscellaneous: false,
        coversLaboratory: false,
        coversOther: false,
        students: [
          {
            studentId: 1,
            student: {
              gradeLevel: 'GRADE_SCHOOL',
              fees: [
                {
                  tuitionFee: 8000,
                  otherFee: 1000,
                  miscellaneousFee: 1000,
                  laboratoryFee: 0,
                  amountSubsidy: 1000,
                  academicYear: '2024-2025',
                },
              ],
            },
          },
        ],
      },
    ]);

    const { GET } = await import('@/app/api/export/summary/route');
    const response = await GET(new NextRequest('http://localhost/api/export/summary?format=xlsx'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    const workbook = await loadWorkbookFromBuffer(await response.arrayBuffer());
    expect(workbook.worksheets.map((worksheet: ExcelJS.Worksheet) => worksheet.name)).toEqual([
      'Grade School',
      'Junior High',
      'Senior High',
      'College',
    ]);

    const sheet = workbook.getWorksheet('Grade School');
    expect(sheet).toBeDefined();

    expect(sheet?.getCell(1, 1).text).toBe('SCHOLARSHIP');
    expect(sheet?.getCell(1, 8).text).toBe('2022-2023');
    expect(sheet?.getCell(2, 1).text).toBe('INTERNALLY FUNDED');
    expect(sheet?.getCell(3, 1).text).toBe('Employees Ward (BED/SHS)');
    expect(sheet?.getCell(3, 4).text).toBe('5,000.00/STUDENT/1,000.00 SUBSIDY');
    expect(sheet?.getCell(3, 16).text).toBe('1');
    expect(sheet?.getCell(3, 18).text).toBe('0.10');
    expect(sheet?.getCell(3, 19).text).toBe('10%');
    expect(sheet ? fillRgb(sheet.getCell('A2')) : undefined).toBe('FFFF00');
    expect(sheet ? fillRgb(sheet.getCell('A12')) : undefined).toBe('FF0000');
  });
});
