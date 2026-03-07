import { getGradeLevelForStudent } from './validations';
import prisma from './prisma';

/**
 * Validates if a student can be assigned a specific scholarship based on grade level and program compatibility
 * @param studentId The ID of the student
 * @param scholarshipId The ID of the scholarship
 * @throws Error if the student is not eligible for the scholarship
 */
export async function validateStudentScholarshipEligibility(studentId: number, scholarshipId: number): Promise<void> {
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

  // Check if student grade level is eligible for the scholarship
  const studentGradeLevels = getGradeLevelForStudent(student.gradeLevel);
  const eligibleGradeLevels = scholarship.eligibleGradeLevels.split(',').map(level => level.trim().toUpperCase());
  
  // Check if any of the student's possible grade level representations match the eligible levels
  const isGradeLevelEligible = studentGradeLevels.some(level => 
    eligibleGradeLevels.includes(level.toUpperCase())
  );

  if (!isGradeLevelEligible) {
    throw new Error(
      `Student grade level '${student.gradeLevel}' is not eligible for scholarship ` +
      `'${scholarship.scholarshipName}' which is only available for: ${scholarship.eligibleGradeLevels}`
    );
  }

  // Check if scholarship has program restrictions
  if (scholarship.eligiblePrograms) {
    const eligiblePrograms = scholarship.eligiblePrograms.split(',').map(prog => prog.trim().toLowerCase());
    const studentProgram = student.program.toLowerCase();
    
    const isProgramEligible = eligiblePrograms.includes(studentProgram);
    
    if (!isProgramEligible) {
      throw new Error(
        `Student program '${student.program}' is not eligible for scholarship ` +
        `'${scholarship.scholarshipName}' which is only available for: ${scholarship.eligiblePrograms}`
      );
    }
  }
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
    const studentGradeLevels = getGradeLevelForStudent(student.gradeLevel);
    const eligibleGradeLevels = scholarship.eligibleGradeLevels.split(',').map(level => level.trim().toUpperCase());
    
    const isGradeLevelEligible = studentGradeLevels.some(level => 
      eligibleGradeLevels.includes(level.toUpperCase())
    );

    if (!isGradeLevelEligible) {
      throw new Error(
        `Student grade level '${student.gradeLevel}' is not eligible for scholarship ` +
        `'${scholarship.scholarshipName}' which is only available for: ${scholarship.eligibleGradeLevels}`
      );
    }

    // Check if scholarship has program restrictions
    if (scholarship.eligiblePrograms) {
      const eligiblePrograms = scholarship.eligiblePrograms.split(',').map(prog => prog.trim().toLowerCase());
      const studentProgram = student.program.toLowerCase();
      
      const isProgramEligible = eligiblePrograms.includes(studentProgram);
      
      if (!isProgramEligible) {
        throw new Error(
          `Student program '${student.program}' is not eligible for scholarship ` +
          `'${scholarship.scholarshipName}' which is only available for: ${scholarship.eligiblePrograms}`
        );
      }
    }
  }
}