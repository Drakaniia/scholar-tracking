import { beforeEach, describe, expect, it, vi } from 'vitest';

const runDueAcademicYearPromotions = vi.fn();

vi.mock('@/lib/academic-year-service', () => ({
  runDueAcademicYearPromotions,
}));

describe('GET /api/cron/auto-promote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('rejects requests without the cron secret bearer token', async () => {
    const { GET } = await import('@/app/api/cron/auto-promote/route');

    const response = await GET(new Request('http://localhost/api/cron/auto-promote'));

    expect(response.status).toBe(401);
    expect(runDueAcademicYearPromotions).not.toHaveBeenCalled();
  });

  it('runs due promotions once for an authorized cron request', async () => {
    runDueAcademicYearPromotions.mockResolvedValueOnce({
      success: true,
      processedAcademicYears: 1,
      promotedCount: 3,
      graduatedCount: 1,
      skippedCount: 0,
      errorCount: 0,
      results: [],
    });
    const { GET } = await import('@/app/api/cron/auto-promote/route');

    const response = await GET(
      new Request('http://localhost/api/cron/auto-promote', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(runDueAcademicYearPromotions).toHaveBeenCalledTimes(1);
    expect(body).toMatchObject({
      success: true,
      data: {
        processedAcademicYears: 1,
        promotedCount: 3,
        graduatedCount: 1,
        skippedCount: 0,
        errorCount: 0,
      },
    });
  });
});
