import { describe, expect, it } from 'vitest';

import { resolvePromotionTarget } from '@/lib/academic-year-service';

describe('resolvePromotionTarget', () => {
  it('promotes Grade 7 to Grade 8 within junior high', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 7',
        program: 'General Education',
        termType: 'SEMESTER',
      })
    ).toEqual({
      action: 'PROMOTE',
      gradeLevel: 'JUNIOR_HIGH',
      yearLevel: 'Grade 8',
    });
  });

  it('promotes Grade 10 to Grade 11 in senior high', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 10',
        program: 'General Education',
        termType: 'SEMESTER',
      })
    ).toEqual({
      action: 'PROMOTE',
      gradeLevel: 'SENIOR_HIGH',
      yearLevel: 'Grade 11',
    });
  });

  it('promotes Grade 12 to trimester College 1st Year with an undeclared program', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        program: 'STEM',
        termType: 'SEMESTER',
      })
    ).toEqual({
      action: 'PROMOTE',
      gradeLevel: 'COLLEGE',
      yearLevel: '1st Year',
      termType: 'TRIMESTER',
      program: 'Undeclared College Program',
    });
  });

  it('graduates College 3rd Year students', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'COLLEGE',
        yearLevel: '3rd Year',
        program: 'BS Computer Science',
        termType: 'TRIMESTER',
      })
    ).toEqual({
      action: 'GRADUATE',
    });
  });

  it('graduates legacy College 4th and 5th Year students', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'COLLEGE',
        yearLevel: '4th Year',
        program: 'BS Computer Science',
        termType: 'SEMESTER',
      })
    ).toEqual({
      action: 'GRADUATE',
    });

    expect(
      resolvePromotionTarget({
        gradeLevel: 'COLLEGE',
        yearLevel: '5th Year',
        program: 'BS Engineering',
        termType: 'SEMESTER',
      })
    ).toEqual({
      action: 'GRADUATE',
    });
  });
});
