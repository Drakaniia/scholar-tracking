import { describe, expect, it } from 'vitest';

import { markActiveAcademicYear, upsertAcademicYear } from '@/lib/academic-year-ui-updates';
import type { AcademicYear } from '@/types';

const years: AcademicYear[] = [
  {
    id: 1,
    year: '2025-2026',
    startDate: '2025-06-01',
    endDate: '2026-05-31',
    semester: '1ST',
    isActive: true,
    promotionDate: '2026-05-31',
    promotionProcessedAt: null,
  },
  {
    id: 2,
    year: '2026-2027',
    startDate: '2026-06-01',
    endDate: '2027-05-31',
    semester: '1ST',
    isActive: false,
    promotionDate: '2027-05-31',
    promotionProcessedAt: null,
  },
];

describe('academic year UI updates', () => {
  it('replaces a saved academic year and makes it the only active year when needed', () => {
    const updated = upsertAcademicYear(years, {
      ...years[1],
      semester: '2ND',
      isActive: true,
    });

    expect(updated).toEqual([
      { ...years[1], semester: '2ND', isActive: true },
      { ...years[0], isActive: false },
    ]);
  });

  it('marks a selected academic year active locally', () => {
    expect(markActiveAcademicYear(years, 2).map((year) => [year.id, year.isActive])).toEqual([
      [1, false],
      [2, true],
    ]);
  });
});
