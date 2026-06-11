import { describe, expect, it } from 'vitest';

import {
  getAcademicYearPromotionReminder,
  getAcademicYearPromotionStatus,
} from '@/lib/academic-year-promotion-reminder';
import type { AcademicYear } from '@/types';

function academicYear(overrides: Partial<AcademicYear> = {}): AcademicYear {
  return {
    id: 23,
    year: '2025-2026',
    startDate: '2025-06-01',
    endDate: '2026-05-31',
    semester: '1ST',
    isActive: true,
    promotionDate: '2026-05-31',
    promotionProcessedAt: null,
    ...overrides,
  };
}

describe('academic year promotion reminder', () => {
  it('marks an unprocessed academic year due on its configured promotion date', () => {
    const reminder = getAcademicYearPromotionReminder(
      academicYear(),
      new Date('2026-05-30T16:00:00.000Z')
    );

    expect(reminder).toMatchObject({
      isDue: true,
      reason: 'promotion-date',
      triggerDateKey: '2026-05-31',
      daysPastDue: 0,
    });
    expect(
      getAcademicYearPromotionStatus(academicYear(), new Date('2026-05-30T16:00:00.000Z'))
    ).toBe('due');
  });

  it('stays pending before the configured promotion date', () => {
    const reminder = getAcademicYearPromotionReminder(
      academicYear(),
      new Date('2026-05-29T15:59:59.000Z')
    );

    expect(reminder).toMatchObject({
      isDue: false,
      reason: 'promotion-date',
      triggerDateKey: '2026-05-31',
    });
    expect(
      getAcademicYearPromotionStatus(academicYear(), new Date('2026-05-29T15:59:59.000Z'))
    ).toBe('pending');
  });

  it('falls back to the day after the academic year ends when promotion date is blank', () => {
    const yearWithoutPromotionDate = academicYear({ promotionDate: null });

    expect(
      getAcademicYearPromotionReminder(
        yearWithoutPromotionDate,
        new Date('2026-05-31T15:59:59.000Z')
      )
    ).toMatchObject({
      isDue: false,
      reason: 'academic-year-ended',
      triggerDateKey: '2026-06-01',
    });

    expect(
      getAcademicYearPromotionReminder(
        yearWithoutPromotionDate,
        new Date('2026-05-31T16:00:00.000Z')
      )
    ).toMatchObject({
      isDue: true,
      reason: 'academic-year-ended',
      triggerDateKey: '2026-06-01',
      daysPastDue: 0,
    });
  });

  it('does not remind after promotion has been processed', () => {
    const processedYear = academicYear({
      promotionProcessedAt: '2026-06-01T02:00:00.000Z',
    });

    expect(
      getAcademicYearPromotionReminder(processedYear, new Date('2026-06-02T00:00:00.000Z'))
    ).toBeNull();
    expect(
      getAcademicYearPromotionStatus(processedYear, new Date('2026-06-02T00:00:00.000Z'))
    ).toBe('completed');
  });
});
