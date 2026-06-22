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

  it('deduplicates academic years when mixed formats exist (e.g. "2026" and "2026-2027")', async () => {
    prismaMock.studentFees.findMany.mockResolvedValueOnce([
      {
        studentId: 1,
        academicYear: '2026-2027', // full format
        student: { gradeLevel: 'GRADE_SCHOOL' },
      },
    ]);
    prismaMock.academicYear.findMany.mockResolvedValueOnce([
      { year: '2026' }, // short format (start year only)
    ]);
    prismaMock.scholarship.findMany.mockResolvedValueOnce([]);

    const { GET } = await import('@/app/api/export/summary/route');
    const response = await GET(new NextRequest('http://localhost/api/export/summary?format=xlsx'));

    expect(response.status).toBe(200);

    const workbook = await loadWorkbookFromBuffer(await response.arrayBuffer());
    const sheet = workbook.getWorksheet('Grade School');
    expect(sheet).toBeDefined();

    // Header row: columns 8, 12, 16 should have 3 unique consecutive years
    const year1 = sheet?.getCell(1, 8).text;
    const year2 = sheet?.getCell(1, 12).text;
    const year3 = sheet?.getCell(1, 16).text;

    // No duplicates
    expect(year1).not.toBe(year2);
    expect(year2).not.toBe(year3);
    expect(year1).not.toBe(year3);

    // Should resolve to 3 consecutive years: 2024-2025, 2025-2026, 2026-2027
    // (2026-2027 is the only real year, so it pads back 2 years)
    const uniqueYears = [year1, year2, year3].filter(Boolean);
    expect(uniqueYears).toHaveLength(3);
    expect(uniqueYears).toContain('2026-2027');
    // The 3 years should be consecutive: parse start years should differ by 1
    const startYears = [year1, year2, year3]
      .filter(Boolean)
      .map((y) => parseInt(y!.match(/^(\d{4})/)![1], 10))
      .sort((a, b) => a - b);
    expect(startYears[1] - startYears[0]).toBe(1);
    expect(startYears[2] - startYears[1]).toBe(1);
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

  it('filters data by academic year when academicYear query param is provided', async () => {
    prismaMock.studentFees.findMany.mockResolvedValueOnce([
      {
        studentId: 1,
        academicYear: '2023-2024',
        student: { gradeLevel: 'GRADE_SCHOOL' },
      },
      {
        studentId: 1,
        academicYear: '2024-2025',
        student: { gradeLevel: 'GRADE_SCHOOL' },
      },
      {
        studentId: 2,
        academicYear: '2024-2025',
        student: { gradeLevel: 'GRADE_SCHOOL' },
      },
    ]);
    prismaMock.academicYear.findMany.mockResolvedValueOnce([
      { id: 1, year: '2023-2024' },
      { id: 2, year: '2024-2025' },
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
            academicYearId: 1, // 2023-2024
            student: {
              gradeLevel: 'GRADE_SCHOOL',
              fees: [
                {
                  tuitionFee: 8000,
                  otherFee: 1000,
                  miscellaneousFee: 1000,
                  laboratoryFee: 0,
                  amountSubsidy: 1000,
                  academicYear: '2023-2024',
                },
              ],
            },
          },
          {
            studentId: 1,
            academicYearId: 2, // 2024-2025
            student: {
              gradeLevel: 'GRADE_SCHOOL',
              fees: [
                {
                  tuitionFee: 9000,
                  otherFee: 1000,
                  miscellaneousFee: 1000,
                  laboratoryFee: 0,
                  amountSubsidy: 1000,
                  academicYear: '2024-2025',
                },
              ],
            },
          },
          {
            studentId: 2,
            academicYearId: 2, // 2024-2025
            student: {
              gradeLevel: 'GRADE_SCHOOL',
              fees: [
                {
                  tuitionFee: 7000,
                  otherFee: 500,
                  miscellaneousFee: 800,
                  laboratoryFee: 0,
                  amountSubsidy: 500,
                  academicYear: '2024-2025',
                },
              ],
            },
          },
        ],
      },
    ]);

    const { GET } = await import('@/app/api/export/summary/route');
    const response = await GET(
      new NextRequest('http://localhost/api/export/summary?format=xlsx&academicYear=2024-2025')
    );

    expect(response.status).toBe(200);

    const workbook = await loadWorkbookFromBuffer(await response.arrayBuffer());
    const sheet = workbook.getWorksheet('Grade School');
    expect(sheet).toBeDefined();

    // Only 2024-2025 data should be included, 2 students with fees in that year
    // Column 16 (0-indexed 15) = METRIC_COLUMNS[2].count = third (most recent) year
    expect(sheet?.getCell(3, 16).text).toBe('2');

    // First and second year columns should be empty (no data for 2022-2023, 2023-2024)
    // Column 8 (0-indexed 7) = METRIC_COLUMNS[0].count = first year
    expect(sheet?.getCell(3, 8).text).toBe('');
    // Column 12 (0-indexed 11) = METRIC_COLUMNS[1].count = second year
    expect(sheet?.getCell(3, 12).text).toBe('');
  });

  it('prevents browser caching of export data with no-store headers', async () => {
    prismaMock.studentFees.findMany.mockResolvedValueOnce([]);
    prismaMock.academicYear.findMany.mockResolvedValueOnce([]);
    prismaMock.scholarship.findMany.mockResolvedValueOnce([]);

    const { GET } = await import('@/app/api/export/summary/route');
    const response = await GET(
      new NextRequest('http://localhost/api/export/summary?format=xlsx')
    );

    expect(response.status).toBe(200);

    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toBeDefined();
    expect(cacheControl).toContain('no-store');
  });
});
