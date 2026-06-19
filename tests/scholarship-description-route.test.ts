import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  scholarship: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  studentScholarship: {
    findMany: vi.fn(),
  },
  studentFees: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/auth', () => ({
  getSession: vi.fn(async () => ({ id: 1, role: 'ADMIN' })),
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

function createJsonRequest(body: Record<string, unknown>) {
  return new Request('http://localhost/api/scholarships/12', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('scholarship description route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.scholarship.findUnique.mockResolvedValue({
      id: 12,
      scholarshipName: 'Bosco Grant',
      amountSubsidy: 0,
      tuitionFee: 0,
      miscellaneousFee: 0,
      laboratoryFee: 0,
      otherFee: 0,
    });
    prismaMock.scholarship.update.mockResolvedValue({
      id: 12,
      requirements: 'Updated public description',
    });
  });

  it('persists a description payload into the requirements field', async () => {
    const { PUT } = await import('@/app/api/scholarships/[id]/route');

    const response = await PUT(
      createJsonRequest({ description: 'Updated public description' }) as never,
      {
        params: Promise.resolve({ id: '12' }),
      }
    );

    expect(response.status).toBe(200);
    expect(prismaMock.scholarship.update).toHaveBeenCalledWith({
      where: { id: 12 },
      data: {
        requirements: 'Updated public description',
      },
    });
  });
});
