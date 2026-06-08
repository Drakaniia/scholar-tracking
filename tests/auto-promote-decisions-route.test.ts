import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyTokenMock = vi.hoisted(() => vi.fn(async () => ({ id: 1, role: 'ADMIN' })));
const cookieGetMock = vi.hoisted(() => vi.fn(() => ({ value: 'test-token' })));

const prismaMock = vi.hoisted(() => ({
  $transaction: vi.fn(),
  student: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: cookieGetMock,
  })),
}));

vi.mock('@/lib/auth', () => ({
  verifyToken: verifyTokenMock,
}));

vi.mock('@/lib/prisma', () => ({
  default: prismaMock,
}));

function decisionRequest(decisions: Array<{ studentId: number; decision: string }>) {
  return new NextRequest('http://localhost/api/academic-years/auto-promote', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisions }),
  });
}

describe('PATCH /api/academic-years/auto-promote transition decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieGetMock.mockReturnValue({ value: 'test-token' });
    verifyTokenMock.mockResolvedValue({ id: 1, role: 'ADMIN' });
    prismaMock.$transaction.mockResolvedValue([]);
    prismaMock.student.update.mockImplementation((args) => args);
  });

  it('saves a valid Grade 10 transition decision', async () => {
    prismaMock.student.findMany.mockResolvedValueOnce([
      {
        id: 10,
        yearLevel: 'Grade 10',
        isArchived: false,
        status: 'Active',
        graduationStatus: 'Active',
      },
    ]);

    const { PATCH } = await import('@/app/api/academic-years/auto-promote/route');
    const response = await PATCH(
      decisionRequest([{ studentId: 10, decision: 'CONTINUE_SENIOR_HIGH' }])
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      expect.objectContaining({
        where: { id: 10 },
        data: expect.objectContaining({
          transitionDecision: 'CONTINUE_SENIOR_HIGH',
          transitionDecisionBy: 1,
        }),
      }),
    ]);
  });

  it('saves a valid Grade 12 transition decision', async () => {
    prismaMock.student.findMany.mockResolvedValueOnce([
      {
        id: 12,
        yearLevel: 'Grade 12',
        isArchived: false,
        status: 'Active',
        graduationStatus: 'Active',
      },
    ]);

    const { PATCH } = await import('@/app/api/academic-years/auto-promote/route');
    const response = await PATCH(
      decisionRequest([{ studentId: 12, decision: 'CONTINUE_COLLEGE' }])
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.$transaction).toHaveBeenCalledWith([
      expect.objectContaining({
        where: { id: 12 },
        data: expect.objectContaining({
          transitionDecision: 'CONTINUE_COLLEGE',
          transitionDecisionBy: 1,
        }),
      }),
    ]);
  });

  it('rejects a Grade 10 student with a Grade 12-only decision', async () => {
    prismaMock.student.findMany.mockResolvedValueOnce([
      {
        id: 10,
        yearLevel: 'Grade 10',
        isArchived: false,
        status: 'Active',
        graduationStatus: 'Active',
      },
    ]);

    const { PATCH } = await import('@/app/api/academic-years/auto-promote/route');
    const response = await PATCH(decisionRequest([{ studentId: 10, decision: 'CONTINUE_COLLEGE' }]));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid transition decision for Grade 10');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a Grade 12 student with a Grade 10-only decision', async () => {
    prismaMock.student.findMany.mockResolvedValueOnce([
      {
        id: 12,
        yearLevel: 'Grade 12',
        isArchived: false,
        status: 'Active',
        graduationStatus: 'Active',
      },
    ]);

    const { PATCH } = await import('@/app/api/academic-years/auto-promote/route');
    const response = await PATCH(
      decisionRequest([{ studentId: 12, decision: 'CONTINUE_SENIOR_HIGH' }])
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid transition decision for Grade 12');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects non-admin access', async () => {
    verifyTokenMock.mockResolvedValueOnce({ id: 2, role: 'STAFF' });

    const { PATCH } = await import('@/app/api/academic-years/auto-promote/route');
    const response = await PATCH(
      decisionRequest([{ studentId: 12, decision: 'CONTINUE_COLLEGE' }])
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(prismaMock.student.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rejects non-boundary students', async () => {
    prismaMock.student.findMany.mockResolvedValueOnce([
      {
        id: 11,
        yearLevel: 'Grade 11',
        isArchived: false,
        status: 'Active',
        graduationStatus: 'Active',
      },
    ]);

    const { PATCH } = await import('@/app/api/academic-years/auto-promote/route');
    const response = await PATCH(
      decisionRequest([{ studentId: 11, decision: 'CONTINUE_COLLEGE' }])
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Only active Grade 10 and Grade 12 students');
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
});
