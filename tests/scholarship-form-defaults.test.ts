import { describe, expect, it } from 'vitest';

import { buildScholarshipFormDefaultValues } from '@/lib/scholarship-form-defaults';
import type { Scholarship } from '@/types';

const scholarship: Scholarship = {
  id: 7,
  scholarshipName: 'Bosco Scholarship',
  sponsor: 'Bosco Foundation',
  type: 'PAEB',
  source: 'INTERNAL',
  eligibleGradeLevels: 'COLLEGE',
  eligiblePrograms: 'BS Information Technology',
  amount: 12000,
  requirements: 'Submit a renewal letter.',
  status: 'Active',
  isArchived: false,
  grantType: 'FULL',
  coversTuition: true,
  coversMiscellaneous: true,
  coversLaboratory: false,
  coversOther: false,
  coveredTerms: '1ST,2ND',
  otherFeeName: null,
  tuitionFee: 8000,
  miscellaneousFee: 3000,
  laboratoryFee: 0,
  otherFee: 0,
  amountSubsidy: 5000,
  percentSubsidy: 0.4545,
  academicYearId: 42,
};

describe('scholarship form defaults', () => {
  it('keeps description and academic year values when editing a scholarship', () => {
    const defaults = buildScholarshipFormDefaultValues(scholarship);

    expect(defaults.requirements).toBe('Submit a renewal letter.');
    expect(defaults.academicYearId).toBe(42);
  });
});
