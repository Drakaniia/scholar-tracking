import { describe, expect, it } from 'vitest';

import {
  getAcademicTermCode,
  getAcademicTermLabel,
  parseCoveredTerms,
  scholarshipCoversTerm,
} from '@/lib/terms';

describe('term helpers', () => {
  it('uses three semester terms without exposing a seasonal third-term label', () => {
    expect(getAcademicTermCode('3RD')).toBe('3RD');
    expect(getAcademicTermLabel('3RD')).toBe('3rd Semester');
  });

  it('defaults scholarships to first and second semester coverage', () => {
    expect(parseCoveredTerms(undefined)).toEqual(['1ST', '2ND']);
    expect(scholarshipCoversTerm(undefined, '1ST')).toBe(true);
    expect(scholarshipCoversTerm(undefined, '3RD')).toBe(false);
  });

  it('supports LGU-style first through third semester coverage as data', () => {
    const coveredTerms = '1ST,2ND,3RD';

    expect(scholarshipCoversTerm(coveredTerms, '1ST')).toBe(true);
    expect(scholarshipCoversTerm(coveredTerms, '2ND')).toBe(true);
    expect(scholarshipCoversTerm(coveredTerms, '3RD')).toBe(true);
  });
});
