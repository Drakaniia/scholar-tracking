import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as XLSX from 'xlsx';

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
        amountSubsidy: 0,
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

    const workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), {
      type: 'buffer',
      cellStyles: true,
    });
    expect(workbook.SheetNames).toEqual(['Grade School', 'Junior High', 'Senior High', 'College']);

    const sheet = workbook.Sheets['Grade School'];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      raw: false,
      defval: '',
    });

    expect(rows[0][0]).toBe('SCHOLARSHIP');
    expect(rows[0][7]).toBe('2022-2023');
    expect(rows[1][0]).toBe('INTERNALLY FUNDED');
    expect(rows[2][0]).toBe('Employees Ward (BED/SHS)');
    expect(rows[2][3]).toBe('5,000.00/STUDENT');
    expect(rows[2][15]).toBe('1');
    expect(rows[2][17]).toBe('0.10');
    expect(rows[2][18]).toBe('10%');
    expect(sheet.A2.s?.fgColor?.rgb).toBe('FFFF00');
    expect(sheet.A12.s?.fgColor?.rgb).toBe('FF0000');
  });
});
