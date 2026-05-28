import { describe, expect, it } from 'vitest';

import {
  isGradeLevelEligibleForScholarship,
  isScholarshipEligibleForStudent,
} from '@/lib/validations';

describe('scholarship eligibility helpers', () => {
  it('matches the scholarship category labels used by the scholarship setup', () => {
    expect(isGradeLevelEligibleForScholarship('GRADE_SCHOOL', 'BED')).toBe(true);
    expect(isGradeLevelEligibleForScholarship('JUNIOR_HIGH', 'JHS')).toBe(true);
    expect(isGradeLevelEligibleForScholarship('SENIOR_HIGH', 'SHS')).toBe(true);
    expect(isGradeLevelEligibleForScholarship('COLLEGE', 'HIED')).toBe(true);
  });

  it('does not show scholarships from other student level categories', () => {
    expect(isGradeLevelEligibleForScholarship('JUNIOR_HIGH', 'BED')).toBe(false);
    expect(isGradeLevelEligibleForScholarship('SENIOR_HIGH', 'JHS')).toBe(false);
    expect(isGradeLevelEligibleForScholarship('GRADE_SCHOOL', 'SHS')).toBe(false);
    expect(isGradeLevelEligibleForScholarship('COLLEGE', 'BED,JHS,SHS')).toBe(false);
  });

  it('continues to support existing stored grade level values', () => {
    expect(isGradeLevelEligibleForScholarship('JUNIOR_HIGH', 'GRADE_SCHOOL,JUNIOR_HIGH')).toBe(
      true
    );
    expect(isGradeLevelEligibleForScholarship('SENIOR_HIGH', 'JUNIOR_HIGH,SENIOR_HIGH')).toBe(
      true
    );
    expect(isGradeLevelEligibleForScholarship('COLLEGE', 'SENIOR_HIGH,COLLEGE')).toBe(true);
  });

  it('supports slash-separated category labels such as JHS/SHS', () => {
    expect(isGradeLevelEligibleForScholarship('JUNIOR_HIGH', 'JHS/SHS')).toBe(true);
    expect(isGradeLevelEligibleForScholarship('SENIOR_HIGH', 'JHS/SHS')).toBe(true);
    expect(isGradeLevelEligibleForScholarship('COLLEGE', 'JHS/SHS')).toBe(false);
  });

  it('applies college program restrictions after grade level compatibility', () => {
    const scholarship = {
      eligibleGradeLevels: 'COLLEGE',
      eligiblePrograms: 'BS Education,BS Nursing',
    };

    expect(
      isScholarshipEligibleForStudent(
        { gradeLevel: 'COLLEGE', program: 'BS Education' },
        scholarship
      )
    ).toBe(true);
    expect(
      isScholarshipEligibleForStudent(
        { gradeLevel: 'COLLEGE', program: 'BS Computer Science' },
        scholarship
      )
    ).toBe(false);
  });
});
