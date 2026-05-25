import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  academicYear: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => ({ value: 'test-token' })),
  })),
}));

vi.mock('@/lib/auth', () => ({
  verifyToken: vi.fn(async () => ({ id: 1, role: 'ADMIN' })),
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

function createJsonRequest(url: string, body: Record<string, unknown>) {
  return new Request(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('academic years route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation((callback) =>
      callback({ academicYear: prismaMock.academicYear })
    );
  });

  it('updates an academic year without reopening promotion when the promotion date is unchanged', async () => {
    const existingAcademicYear = {
      id: 1,
      year: '2025-2026',
      startDate: new Date('2025-06-01T00:00:00.000Z'),
      endDate: new Date('2026-05-31T00:00:00.000Z'),
      semester: '1ST',
      isActive: true,
      promotionDate: new Date('2026-05-31T00:00:00.000Z'),
      promotionProcessedAt: new Date('2026-06-01T00:00:00.000Z'),
    };
    prismaMock.academicYear.findUnique.mockResolvedValueOnce(existingAcademicYear);
    prismaMock.academicYear.update.mockResolvedValueOnce(existingAcademicYear);

    const { PUT } = await import('@/app/api/academic-years/route');
    const response = await PUT(
      createJsonRequest('http://localhost/api/academic-years?id=1', {
        year: '2025-2026',
        startDate: '2025-06-01',
        endDate: '2026-05-31',
        semester: '1ST',
        promotionDate: '2026-05-31',
        isActive: true,
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.academicYear.updateMany).toHaveBeenCalledWith({
      where: { isActive: true, id: { not: 1 } },
      data: { isActive: false },
    });
    const updateData = prismaMock.academicYear.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('promotionProcessedAt');
    expect(updateData.startDate.toISOString()).toBe('2025-06-01T00:00:00.000Z');
    expect(updateData.endDate.toISOString()).toBe('2026-05-31T00:00:00.000Z');
  });

  it('reopens promotion when the saved promotion date changes', async () => {
    const existingAcademicYear = {
      id: 1,
      year: '2025-2026',
      startDate: new Date('2025-06-01T00:00:00.000Z'),
      endDate: new Date('2026-05-31T00:00:00.000Z'),
      semester: '1ST',
      isActive: true,
      promotionDate: new Date('2026-05-31T00:00:00.000Z'),
      promotionProcessedAt: new Date('2026-06-01T00:00:00.000Z'),
    };
    const updatedAcademicYear = {
      ...existingAcademicYear,
      promotionDate: new Date('2026-06-01T00:00:00.000Z'),
      promotionProcessedAt: null,
    };
    prismaMock.academicYear.findUnique.mockResolvedValueOnce(existingAcademicYear);
    prismaMock.academicYear.update.mockResolvedValueOnce(updatedAcademicYear);

    const { PUT } = await import('@/app/api/academic-years/route');
    const response = await PUT(
      createJsonRequest('http://localhost/api/academic-years?id=1', {
        year: '2025-2026',
        startDate: '2025-06-01',
        endDate: '2026-05-31',
        semester: '1ST',
        promotionDate: '2026-06-01',
        isActive: true,
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.academicYear.update.mock.calls[0][0].data.promotionProcessedAt).toBeNull();
  });

  it('rejects invalid date ranges before changing active academic years', async () => {
    prismaMock.academicYear.findUnique.mockResolvedValueOnce({
      id: 1,
      year: '2025-2026',
      startDate: new Date('2025-06-01T00:00:00.000Z'),
      endDate: new Date('2026-05-31T00:00:00.000Z'),
      semester: '1ST',
      isActive: true,
      promotionDate: null,
      promotionProcessedAt: null,
    });

    const { PUT } = await import('@/app/api/academic-years/route');
    const response = await PUT(
      createJsonRequest('http://localhost/api/academic-years?id=1', {
        startDate: '2026-06-01',
        endDate: '2026-05-31',
        isActive: true,
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Start date must be before end date');
    expect(prismaMock.academicYear.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.academicYear.update).not.toHaveBeenCalled();
  });
});
