import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  student: {
    update: vi.fn(),
  },
  scholarship: {
    count: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
  },
}));

const authMock = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

const queryOptimizerMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  invalidate: vi.fn(),
  invalidatePattern: vi.fn(),
}));

vi.mock('@/lib/auth', () => authMock);

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

vi.mock('@/lib/query-optimizer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/query-optimizer')>();

  return {
    ...actual,
    queryOptimizer: queryOptimizerMock,
  };
});

vi.mock('@/lib/graduation-service', () => ({
  hasStudentGraduated: vi.fn(() => false),
}));

vi.mock('@/lib/scholarship-validation', () => ({
  validateMultipleStudentScholarshipEligibility: vi.fn(),
}));

function createRequest(url: string, method: string, body?: Record<string, unknown>) {
  return new Request(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('archive routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.getSession.mockResolvedValue({ id: 1, role: 'ADMIN' });
    queryOptimizerMock.get.mockReturnValue(null);
  });

  it('returns a JSON validation error when a student archive request has no body', async () => {
    const { PATCH } = await import('@/app/api/students/[id]/route');

    const response = (await PATCH(
      createRequest('http://localhost/api/students/10', 'PATCH') as never,
      { params: Promise.resolve({ id: '10' }) }
    ))!;
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ success: false, error: 'Action is required' });
    expect(prismaMock.student.update).not.toHaveBeenCalled();
  });

  it('archives a student through DELETE for archive callers that do not send a JSON body', async () => {
    prismaMock.student.update.mockResolvedValueOnce({ id: 10, isArchived: true });
    const { DELETE } = await import('@/app/api/students/[id]/route');

    const response = await DELETE(
      createRequest('http://localhost/api/students/10', 'DELETE') as never,
      { params: Promise.resolve({ id: '10' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 10, isArchived: true });
    expect(prismaMock.student.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { isArchived: true },
    });
  });

  it('returns a JSON validation error when a scholarship archive request has no body', async () => {
    const { PATCH } = await import('@/app/api/scholarships/[id]/route');

    const response = (await PATCH(
      createRequest('http://localhost/api/scholarships/20', 'PATCH') as never,
      { params: Promise.resolve({ id: '20' }) }
    ))!;
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ success: false, error: 'Action is required' });
    expect(prismaMock.scholarship.update).not.toHaveBeenCalled();
  });

  it('archives a scholarship through DELETE for archive callers that do not send a JSON body', async () => {
    prismaMock.scholarship.update.mockResolvedValueOnce({ id: 20, isArchived: true });
    const { DELETE } = await import('@/app/api/scholarships/[id]/route');

    const response = await DELETE(
      createRequest('http://localhost/api/scholarships/20', 'DELETE') as never,
      { params: Promise.resolve({ id: '20' }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 20, isArchived: true });
    expect(prismaMock.scholarship.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { isArchived: true },
    });
  });

  it('keeps active and archived scholarship list cache keys separate', async () => {
    prismaMock.scholarship.findMany.mockResolvedValue([]);
    prismaMock.scholarship.count.mockResolvedValue(0);
    const { GET } = await import('@/app/api/scholarships/route');

    await GET(new NextRequest('http://localhost/api/scholarships?archived=false&page=1&limit=10'));
    await GET(new NextRequest('http://localhost/api/scholarships?archived=true&page=1&limit=10'));

    const cacheKeys = queryOptimizerMock.get.mock.calls.map(([key]) => key);
    expect(cacheKeys[0]).not.toBe(cacheKeys[1]);
  });

  it('keeps active and archived scholarship count cache keys separate', async () => {
    prismaMock.scholarship.count.mockResolvedValue(0);
    const { GET } = await import('@/app/api/scholarships/route');

    await GET(new NextRequest('http://localhost/api/scholarships?action=counts&archived=false'));
    await GET(new NextRequest('http://localhost/api/scholarships?action=counts&archived=true'));

    const cacheKeys = queryOptimizerMock.get.mock.calls.map(([key]) => key);
    expect(cacheKeys[0]).not.toBe(cacheKeys[1]);
  });
});
