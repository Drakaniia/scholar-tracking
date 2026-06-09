import { describe, expect, it } from 'vitest';

import {
  getUnavailableAcademicYearIdsForScholarship,
  hasScholarshipSelectionForAcademicYear,
} from '@/lib/student-scholarship-year-options';

describe('student scholarship academic year options', () => {
  it('marks years used by the same scholarship on another assignment as unavailable', () => {
    const unavailableYears = getUnavailableAcademicYearIdsForScholarship(
      [
        { clientKey: 'current', scholarshipId: 10, academicYearId: 2026 },
        { clientKey: 'other-same-scholarship', scholarshipId: 10, academicYearId: 2025 },
        { clientKey: 'other-different-scholarship', scholarshipId: 20, academicYearId: 2024 },
      ],
      'current',
      10,
      null
    );

    expect(unavailableYears.has(2025)).toBe(true);
    expect(unavailableYears.has(2026)).toBe(false);
    expect(unavailableYears.has(2024)).toBe(false);
  });

  it('uses the active academic year for existing assignments without a saved academic year', () => {
    const unavailableYears = getUnavailableAcademicYearIdsForScholarship(
      [
        { clientKey: 'current', scholarshipId: 10, academicYearId: 2026 },
        { clientKey: 'existing-with-default-year', scholarshipId: 10, academicYearId: null },
      ],
      'current',
      10,
      2027
    );

    expect(unavailableYears.has(2027)).toBe(true);
  });

  it('treats a blank saved academic year as the active year when checking selected rows', () => {
    const isSelected = hasScholarshipSelectionForAcademicYear(
      [{ clientKey: 'existing-with-default-year', scholarshipId: 10, academicYearId: null }],
      10,
      2027,
      2027
    );

    expect(isSelected).toBe(true);
  });
});
