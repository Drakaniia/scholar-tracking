import prisma from './prisma';
import {
  isGradeLevelEligibleForScholarship,
  isProgramEligibleForScholarship,
  isScholarshipEligibleForStudent,
} from './validations';

/**
 * Validates if a student can be assigned a specific scholarship based on grade level and program compatibility
 * @param studentId The ID of the student
 * @param scholarshipId The ID of the scholarship
 * @throws Error if the student is not eligible for the scholarship
 */
export async function validateStudentScholarshipEligibility(
  studentId: number,
  scholarshipId: number
): Promise<void> {
  // Fetch student and scholarship data
  const [student, scholarship] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
    }),
    prisma.scholarship.findUnique({
      where: { id: scholarshipId },
    }),
  ]);

  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  if (!scholarship) {
    throw new Error(`Scholarship with ID ${scholarshipId} not found`);
  }

  if (!isGradeLevelEligibleForScholarship(student.gradeLevel, scholarship.eligibleGradeLevels)) {
    throw new Error(
      `Student grade level '${student.gradeLevel}' is not eligible for scholarship ` +
        `'${scholarship.scholarshipName}' which is only available for: ${scholarship.eligibleGradeLevels}`
    );
  }

  if (!isProgramEligibleForScholarship(student.program, scholarship.eligiblePrograms)) {
    throw new Error(
      `Student program '${student.program}' is not eligible for scholarship ` +
        `'${scholarship.scholarshipName}' which is only available for: ${scholarship.eligiblePrograms}`
    );
  }
}

/**
 * Filters out scholarships that are not eligible for a student based on their grade level and program
 * @param student The student object with gradeLevel and program
 * @param scholarships Array of scholarships with their eligibility criteria
 * @returns Array of scholarship IDs that are eligible
 */
export function filterEligibleScholarships(
  student: { gradeLevel: string; program: string },
  scholarships: Array<{ id: number; eligibleGradeLevels: string; eligiblePrograms: string | null }>
): number[] {
  return scholarships
    .filter((scholarship) => isScholarshipEligibleForStudent(student, scholarship))
    .map((s) => s.id);
}

/**
 * Validates multiple scholarship assignments for a student
 * @param studentId The ID of the student
 * @param scholarshipIds Array of scholarship IDs to assign
 * @throws Error if any scholarship is not eligible for the student
 */
export async function validateMultipleStudentScholarshipEligibility(
  studentId: number,
  scholarshipIds: number[]
): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  // Fetch all scholarships at once
  const scholarships = await prisma.scholarship.findMany({
    where: { id: { in: scholarshipIds } },
  });

  // Check each scholarship for eligibility
  for (const scholarship of scholarships) {
    if (!isGradeLevelEligibleForScholarship(student.gradeLevel, scholarship.eligibleGradeLevels)) {
      throw new Error(
        `Student grade level '${student.gradeLevel}' is not eligible for scholarship ` +
          `'${scholarship.scholarshipName}' which is only available for: ${scholarship.eligibleGradeLevels}`
      );
    }

    if (!isProgramEligibleForScholarship(student.program, scholarship.eligiblePrograms)) {
      throw new Error(
        `Student program '${student.program}' is not eligible for scholarship ` +
          `'${scholarship.scholarshipName}' which is only available for: ${scholarship.eligiblePrograms}`
      );
    }
  }
}
