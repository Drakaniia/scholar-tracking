import { NextRequest } from 'next/server';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyTokenMock = vi.hoisted(() => vi.fn(async () => ({ id: 1, role: 'ADMIN' })));
const cookieGetMock = vi.hoisted(() => vi.fn(() => ({ value: 'test-token' })));
const promoteSelectedStudentsMock = vi.hoisted(() =>
  vi.fn(
    async (): Promise<unknown> => ({
      success: true,
      cohortCount: 2,
      selectedCount: 2,
      archivedCount: 0,
      promotedCount: 1,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      results: [] as Array<Record<string, unknown>>,
    })
  )
);

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: cookieGetMock,
  })),
}));

vi.mock('@/lib/auth', () => ({
  verifyToken: verifyTokenMock,
}));

vi.mock('@/lib/academic-year-service', () => ({
  promoteSelectedStudents: promoteSelectedStudentsMock,
}));

function bulkRequest(studentIds: unknown[], cohortStudentIds: unknown[] = studentIds) {
  return new NextRequest('http://localhost/api/academic-years/auto-promote/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentIds, cohortStudentIds }),
  });
}

describe('POST /api/academic-years/auto-promote/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieGetMock.mockReturnValue({ value: 'test-token' });
    verifyTokenMock.mockResolvedValue({ id: 1, role: 'ADMIN' });
    promoteSelectedStudentsMock.mockResolvedValue({
      success: true,
      cohortCount: 2,
      selectedCount: 2,
      archivedCount: 0,
      promotedCount: 1,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      results: [] as Array<Record<string, unknown>>,
    });
  });

  it('promotes the selected student IDs for admins', async () => {
    const { POST } = await import('@/app/api/academic-years/auto-promote/bulk/route');
    const response = await POST(bulkRequest([6, 12]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      cohortCount: 2,
      selectedCount: 2,
      promotedCount: 1,
      archivedCount: 0,
    });
    expect(promoteSelectedStudentsMock).toHaveBeenCalledWith([6, 12], 1, undefined, [6, 12]);
  });

  it('archives the cohort when no continuing students are selected', async () => {
    promoteSelectedStudentsMock.mockResolvedValueOnce({
      success: true,
      cohortCount: 2,
      selectedCount: 0,
      archivedCount: 2,
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      results: [] as Array<Record<string, unknown>>,
    });

    const { POST } = await import('@/app/api/academic-years/auto-promote/bulk/route');
    const response = await POST(bulkRequest([], [6, 12]));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toMatchObject({
      cohortCount: 2,
      selectedCount: 0,
      archivedCount: 2,
    });
    expect(promoteSelectedStudentsMock).toHaveBeenCalledWith([], 1, undefined, [6, 12]);
  });

  it('rejects empty cohorts', async () => {
    const { POST } = await import('@/app/api/academic-years/auto-promote/bulk/route');
    const response = await POST(bulkRequest([]));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('promotion cohort');
    expect(promoteSelectedStudentsMock).not.toHaveBeenCalled();
  });

  it('rejects invalid selection payloads', async () => {
    const { POST } = await import('@/app/api/academic-years/auto-promote/bulk/route');
    const response = await POST(bulkRequest([0, 'bad-id']));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid student selection');
    expect(promoteSelectedStudentsMock).not.toHaveBeenCalled();
  });

  it('returns a controlled error when selected students cannot be promoted', async () => {
    promoteSelectedStudentsMock.mockResolvedValueOnce({
      success: false,
      error: 'No selected cohort students were processed.',
      cohortCount: 1,
      selectedCount: 1,
      archivedCount: 0,
      promotedCount: 0,
      graduatedCount: 0,
      skippedCount: 1,
      errorCount: 1,
      results: [
        {
          studentId: 12,
          studentName: 'Maria Santos',
          fromLevel: 'SENIOR_HIGH - Grade 12',
          toLevel: null,
          action: 'SKIP',
          success: false,
          error: 'Grade 12 requires an end-of-year decision.',
        },
      ],
    });

    const { POST } = await import('@/app/api/academic-years/auto-promote/bulk/route');
    const response = await POST(bulkRequest([12]));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('No selected cohort students were processed.');
    expect(body.data).toMatchObject({
      cohortCount: 1,
      selectedCount: 1,
      skippedCount: 1,
      errorCount: 1,
    });
  });

  it('rejects non-admin users', async () => {
    verifyTokenMock.mockResolvedValueOnce({ id: 2, role: 'STAFF' });

    const { POST } = await import('@/app/api/academic-years/auto-promote/bulk/route');
    const response = await POST(bulkRequest([6]));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(promoteSelectedStudentsMock).not.toHaveBeenCalled();
  });
});
