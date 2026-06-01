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

  it('blocks Grade 10 promotion until an end-of-year decision is recorded', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 10',
        program: 'General Education',
        termType: 'SEMESTER',
      })
    ).toEqual({
      action: 'SKIP',
      reason:
        'Grade 10 requires an end-of-year decision before promotion: continue to Grade 11, completed JHS, transferred out, withdrawn, or retained.',
    });
  });

  it('promotes Grade 10 to Grade 11 when continuing to senior high', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 10',
        program: 'General Education',
        termType: 'SEMESTER',
        transitionDecision: 'CONTINUE_SENIOR_HIGH',
      })
    ).toEqual({
      action: 'PROMOTE',
      gradeLevel: 'SENIOR_HIGH',
      yearLevel: 'Grade 11',
    });
  });

  it('moves Grade 10 completers to the separated registry when they do not continue', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'JUNIOR_HIGH',
        yearLevel: 'Grade 10',
        program: 'General Education',
        termType: 'SEMESTER',
        transitionDecision: 'COMPLETED_JHS',
      })
    ).toEqual({
      action: 'SEPARATE',
      status: 'Completed JHS',
      graduationStatus: 'Completed JHS',
      outcome: 'COMPLETED_JHS',
      reason: 'Student completed Junior High and is not continuing to Senior High in this school',
    });
  });

  it('blocks Grade 12 promotion until an end-of-year decision is recorded', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        program: 'Grade 12',
        termType: 'SEMESTER',
      })
    ).toEqual({
      action: 'SKIP',
      reason:
        'Grade 12 requires an end-of-year decision before promotion: continue to College, graduated SHS, transferred out, withdrawn, or retained.',
    });
  });

  it('promotes Grade 12 to trimester College 1st Year with an undeclared program', () => {
    expect(
      resolvePromotionTarget({
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        program: 'Grade 12',
        termType: 'SEMESTER',
        transitionDecision: 'CONTINUE_COLLEGE',
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
