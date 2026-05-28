// Validation schemas and helpers
import { CreateScholarshipInput, CreateStudentInput } from '@/types';

export function validateStudent(data: Partial<CreateStudentInput>): string[] {
  const errors: string[] = [];

  if (!data.lastName?.trim()) {
    errors.push('Last name is required');
  }

  if (!data.firstName?.trim()) {
    errors.push('First name is required');
  }

  if (!data.program?.trim()) {
    errors.push('Program is required');
  }

  if (!data.yearLevel) {
    errors.push('Year level is required');
  }

  return errors;
}

export function validateScholarship(data: Partial<CreateScholarshipInput>): string[] {
  const errors: string[] = [];

  if (!data.scholarshipName?.trim()) {
    errors.push('Scholarship name is required');
  }

  if (!data.sponsor?.trim()) {
    errors.push('Sponsor is required');
  }

  if (!data.type) {
    errors.push('Scholarship type is required');
  }

  if (data.amount === undefined || data.amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  return errors;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
  // Philippine phone number format
  const phoneRegex = /^(09|\+639)\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

export function getGradeLevelForStudent(studentGradeLevel: string): string[] {
  const normalizedGradeLevel = normalizeEligibilityValue(studentGradeLevel);

  if (isKnownGradeLevel(normalizedGradeLevel, GRADE_LEVEL_ELIGIBILITY_ALIASES.GRADE_SCHOOL)) {
    return [...GRADE_LEVEL_ELIGIBILITY_ALIASES.GRADE_SCHOOL];
  }

  if (isKnownGradeLevel(normalizedGradeLevel, GRADE_LEVEL_ELIGIBILITY_ALIASES.JUNIOR_HIGH)) {
    return [...GRADE_LEVEL_ELIGIBILITY_ALIASES.JUNIOR_HIGH];
  }

  if (isKnownGradeLevel(normalizedGradeLevel, GRADE_LEVEL_ELIGIBILITY_ALIASES.SENIOR_HIGH)) {
    return [...GRADE_LEVEL_ELIGIBILITY_ALIASES.SENIOR_HIGH];
  }

  if (isKnownGradeLevel(normalizedGradeLevel, GRADE_LEVEL_ELIGIBILITY_ALIASES.COLLEGE)) {
    return [...GRADE_LEVEL_ELIGIBILITY_ALIASES.COLLEGE];
  }

  return [studentGradeLevel.toUpperCase(), normalizedGradeLevel];
}

export function isGradeLevelEligibleForScholarship(
  studentGradeLevel: string | null | undefined,
  eligibleGradeLevels: string | null | undefined
): boolean {
  if (!studentGradeLevel) {
    return false;
  }

  const eligibleLevels = parseGradeEligibilityList(eligibleGradeLevels);

  if (eligibleLevels.length === 0) {
    return false;
  }

  const studentGradeLevelAliases = getGradeLevelForStudent(studentGradeLevel).map(
    normalizeEligibilityValue
  );

  return eligibleLevels.some((level) => studentGradeLevelAliases.includes(level));
}

export function isProgramEligibleForScholarship(
  studentProgram: string | null | undefined,
  eligiblePrograms: string | null | undefined
): boolean {
  const programs = parseCommaSeparatedEligibilityList(eligiblePrograms);

  if (programs.length === 0) {
    return true;
  }

  if (!studentProgram?.trim()) {
    return false;
  }

  const normalizedStudentProgram = normalizeProgramValue(studentProgram);

  return programs.some((program) => normalizeProgramValue(program) === normalizedStudentProgram);
}

export function isScholarshipEligibleForStudent(
  student: { gradeLevel?: string | null; program?: string | null },
  scholarship: { eligibleGradeLevels?: string | null; eligiblePrograms?: string | null }
): boolean {
  return (
    isGradeLevelEligibleForScholarship(student.gradeLevel, scholarship.eligibleGradeLevels) &&
    isProgramEligibleForScholarship(student.program, scholarship.eligiblePrograms)
  );
}

const GRADE_LEVEL_ELIGIBILITY_ALIASES = {
  GRADE_SCHOOL: [
    'GRADE_SCHOOL',
    'GRADE SCHOOL',
    'BED',
    'BASIC_EDUCATION',
    'BASIC EDUCATION',
    'BASIC EDUCATION DEPARTMENT',
    'ELEMENTARY',
    'GRADE SCHOOL DEPARTMENT',
    'GS',
    'GRADE 1',
    'GRADE 2',
    'GRADE 3',
    'GRADE 4',
    'GRADE 5',
    'GRADE 6',
  ],
  JUNIOR_HIGH: [
    'JUNIOR_HIGH',
    'JUNIOR HIGH',
    'JUNIOR HIGH SCHOOL',
    'JHS',
    'GRADE 7',
    'GRADE 8',
    'GRADE 9',
    'GRADE 10',
  ],
  SENIOR_HIGH: [
    'SENIOR_HIGH',
    'SENIOR HIGH',
    'SENIOR HIGH SCHOOL',
    'SHS',
    'GRADE 11',
    'GRADE 12',
  ],
  COLLEGE: [
    'COLLEGE',
    'HIED',
    'HI ED',
    'HI-ED',
    'HIGHER EDUCATION',
    'HIGHER_EDUCATION',
    'HIGHER EDUCATION DEPARTMENT',
    'TERTIARY',
    'UNIVERSITY',
  ],
} as const;

function isKnownGradeLevel(normalizedGradeLevel: string, aliases: readonly string[]): boolean {
  return aliases.some((alias) => normalizeEligibilityValue(alias) === normalizedGradeLevel);
}

function parseGradeEligibilityList(value: string | null | undefined): string[] {
  return (value || '')
    .split(/[,;/|]+/)
    .map(normalizeEligibilityValue)
    .filter(Boolean);
}

function parseCommaSeparatedEligibilityList(value: string | null | undefined): string[] {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeEligibilityValue(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function normalizeProgramValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}
