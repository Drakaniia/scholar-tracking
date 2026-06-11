import {
  STUDENT_TRANSITION_DECISIONS,
  type StudentTransitionDecision,
} from '@/types';

type PromotionDecisionStudent = {
  readonly gradeLevel?: string | null;
  readonly yearLevel: string;
};

export const GENERAL_PROMOTION_DECISIONS = [
  'CONTINUE_NEXT_LEVEL',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
  'RETAINED',
] as const satisfies readonly StudentTransitionDecision[];

export const GRADE_10_PROMOTION_DECISIONS = [
  'CONTINUE_SENIOR_HIGH',
  'COMPLETED_JHS',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
  'RETAINED',
] as const satisfies readonly StudentTransitionDecision[];

export const GRADE_12_PROMOTION_DECISIONS = [
  'CONTINUE_COLLEGE',
  'GRADUATED_SHS',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
  'RETAINED',
] as const satisfies readonly StudentTransitionDecision[];

export const COLLEGE_GRADUATING_PROMOTION_DECISIONS = [
  'GRADUATED_COLLEGE',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
  'RETAINED',
] as const satisfies readonly StudentTransitionDecision[];

const STUDENT_TRANSITION_DECISION_SET: ReadonlySet<string> = new Set(
  STUDENT_TRANSITION_DECISIONS
);

function parseGradeNumber(yearLevel: string): number | null {
  const match = yearLevel.trim().match(/^Grade\s+(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function parseCollegeYearNumber(yearLevel: string): number | null {
  const match = yearLevel.trim().match(/^(\d+)(st|nd|rd|th)\s+Year$/i);
  return match ? Number(match[1]) : null;
}

function isGraduatingCollegeStudent(student: PromotionDecisionStudent) {
  if (student.gradeLevel !== 'COLLEGE') return false;
  const collegeYear = parseCollegeYearNumber(student.yearLevel);
  return collegeYear !== null && collegeYear >= 3;
}

export function isStudentTransitionDecision(
  decision?: string | null
): decision is StudentTransitionDecision {
  return typeof decision === 'string' && STUDENT_TRANSITION_DECISION_SET.has(decision);
}

export function getPromotionDecisionOptions(
  student: PromotionDecisionStudent
): readonly StudentTransitionDecision[] {
  const gradeNumber = parseGradeNumber(student.yearLevel);

  if (gradeNumber === 10) return GRADE_10_PROMOTION_DECISIONS;
  if (gradeNumber === 12) return GRADE_12_PROMOTION_DECISIONS;
  if (isGraduatingCollegeStudent(student)) return COLLEGE_GRADUATING_PROMOTION_DECISIONS;

  return GENERAL_PROMOTION_DECISIONS;
}

export function getPromotionDecisionRequirementReason(student: PromotionDecisionStudent) {
  const gradeNumber = parseGradeNumber(student.yearLevel);

  if (gradeNumber === 10) {
    return 'Grade 10 requires an end-of-year decision before promotion: continue to Grade 11, completed JHS, transferred out, withdrawn, or retained.';
  }

  if (gradeNumber === 12) {
    return 'Grade 12 requires an end-of-year decision before promotion: continue to College, graduated SHS, transferred out, withdrawn, or retained.';
  }

  if (isGraduatingCollegeStudent(student)) {
    return `${student.yearLevel} requires an end-of-year decision before promotion: graduated college, transferred out, withdrawn, or retained.`;
  }

  return `${student.yearLevel} requires an end-of-year decision before promotion: continue to next level, transferred out, withdrawn, or retained.`;
}

export function isPromotionDecisionAllowed(
  student: PromotionDecisionStudent,
  decision: StudentTransitionDecision
) {
  return getPromotionDecisionOptions(student).includes(decision);
}

export function getPromotionContinueDecision(
  student: PromotionDecisionStudent
): StudentTransitionDecision | null {
  const gradeNumber = parseGradeNumber(student.yearLevel);

  if (gradeNumber === 10) return 'CONTINUE_SENIOR_HIGH';
  if (gradeNumber === 12) return 'CONTINUE_COLLEGE';
  if (isGraduatingCollegeStudent(student)) return null;

  return 'CONTINUE_NEXT_LEVEL';
}
