import { beforeEach, describe, expect, it } from 'vitest';

describe('GET /api/cron/auto-promote', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('rejects requests without the cron secret bearer token', async () => {
    const { GET } = await import('@/app/api/cron/auto-promote/route');

    const response = await GET(new Request('http://localhost/api/cron/auto-promote'));

    expect(response.status).toBe(401);
  });

  it('rejects authorized cron requests because all-student promotion is disabled', async () => {
    const { GET } = await import('@/app/api/cron/auto-promote/route');

    const response = await GET(
      new Request('http://localhost/api/cron/auto-promote', {
        headers: { authorization: 'Bearer test-cron-secret' },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: expect.stringContaining('Scheduled all-student promotion is disabled'),
    });
  });
});
