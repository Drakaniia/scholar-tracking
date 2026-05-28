import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  scholarship: {
    findMany: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

describe('scholarships export route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses PDF-safe ASCII currency text for scholarship amounts', async () => {
    prismaMock.scholarship.findMany.mockResolvedValueOnce([
      {
        id: 1,
        scholarshipName: 'Academic Scholar (BED/SHS)',
        sponsor: 'School Administration',
        type: 'ACADEMIC_SCHOLAR',
        source: 'INTERNAL',
        amount: 85000,
        tuitionFee: 85000,
        miscellaneousFee: 0,
        laboratoryFee: 0,
        otherFee: 0,
        amountSubsidy: 85000,
        percentSubsidy: 0,
        requirements: '',
        status: 'Active',
        _count: { students: 1 },
      },
    ]);

    const { GET } = await import('@/app/api/export/scholarships/route');
    const response = await GET(
      new NextRequest('http://localhost/api/export/scholarships?format=pdf')
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/pdf');

    const pdfBytes = Buffer.from(await response.arrayBuffer());
    const pdfText = pdfBytes.toString('latin1');

    expect(pdfText).toContain('PHP 85,000');
    expect(pdfBytes.includes(Buffer.from([0xe2, 0x82, 0xb1]))).toBe(false);
    expect(pdfBytes.includes(Buffer.from([0xc3, 0xa2, 0xe2, 0x80, 0x9a, 0xc2, 0xb1]))).toBe(
      false
    );
  });
});
