import { GradeLevel, YEAR_LEVELS } from '@/types';

import { logAudit } from './auth';
import { createStudentBackup } from './backup-service';
import prisma from './prisma';

/**
 * Gets the next year level for a student based on their current grade level and year level
 * @param gradeLevel The student's current grade level
 * @param yearLevel The student's current year level
 * @returns Object with nextYearLevel and isGraduating flags
 */
export function getNextYearLevel(
  gradeLevel: string,
  yearLevel: string
): { nextYearLevel: string | null; isGraduating: boolean } {
  const gradeLevelEnum = gradeLevel as GradeLevel;
  const yearLevels = YEAR_LEVELS[gradeLevelEnum];

  if (!yearLevels || yearLevels.length === 0) {
    return { nextYearLevel: null, isGraduating: false };
  }

  const currentIndex = yearLevels.findIndex(
    (level) => level.toUpperCase() === yearLevel.toUpperCase()
  );

  // If not found or already at last year level
  if (currentIndex === -1 || currentIndex === yearLevels.length - 1) {
    return { nextYearLevel: null, isGraduating: true };
  }

  return {
    nextYearLevel: yearLevels[currentIndex + 1],
    isGraduating: currentIndex === yearLevels.length - 2, // Next level will be graduation
  };
}

/**
 * Checks if the current date is within an active academic year
 * @returns The active academic year if found, null otherwise
 */
export async function getActiveAcademicYear() {
  const now = new Date();

  const activeYear = await prisma.academicYear.findFirst({
    where: {
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
    },
  });

  return activeYear;
}

/**
 * Automatically promotes students to the next year level based on the academic year
 * This should be called when a new academic year/semester starts
 * @param userId The ID of the user triggering the promotion (for audit logging)
 * @returns Statistics about the promotion operation
 */
export async function autoPromoteStudents(userId?: number) {
  const activeAcademicYear = await getActiveAcademicYear();

  if (!activeAcademicYear) {
    return {
      success: false,
      error: 'No active academic year found. Please configure an active academic year first.',
      promotedCount: 0,
      graduatedCount: 0,
      errorCount: 0,
    };
  }

  // Get all active students who are not graduated
  const students = await prisma.student.findMany({
    where: {
      isArchived: false,
      graduationStatus: { not: 'Graduated' },
      status: 'Active',
    },
  });

  let promotedCount = 0;
  let graduatedCount = 0;
  let errorCount = 0;
  const errors: Array<{ studentId: number; error: string }> = [];

  for (const student of students) {
    try {
      const { nextYearLevel, isGraduating } = getNextYearLevel(
        student.gradeLevel,
        student.yearLevel
      );

      if (isGraduating || !nextYearLevel) {
        // Student has graduated
        await prisma.student.update({
          where: { id: student.id },
          data: {
            graduationStatus: 'Graduated',
            graduatedAt: new Date(),
            status: 'Graduated',
          },
        });

        // Remove active scholarships
        await prisma.studentScholarship.deleteMany({
          where: {
            studentId: student.id,
            scholarshipStatus: 'Active',
          },
        });

        // Cancel future disbursements
        await prisma.disbursement.deleteMany({
          where: {
            studentId: student.id,
            disbursementDate: { gte: new Date() },
          },
        });

        // Create audit log
        await createStudentBackup(student.id, userId, 'GRADUATION');
        await logAudit(userId || null, 'AUTO_GRADUATE_STUDENT', 'STUDENT', student.id, {
          studentName: `${student.firstName} ${student.lastName}`,
          gradeLevel: student.gradeLevel,
          yearLevel: student.yearLevel,
          academicYear: activeAcademicYear.year,
          reason: 'Automatic graduation based on academic year',
        });

        graduatedCount++;
      } else {
        // Promote to next year level
        await prisma.student.update({
          where: { id: student.id },
          data: {
            yearLevel: nextYearLevel,
          },
        });

        // Create audit log
        await logAudit(userId || null, 'AUTO_PROMOTE_STUDENT', 'STUDENT', student.id, {
          studentName: `${student.firstName} ${student.lastName}`,
          previousYearLevel: student.yearLevel,
          newYearLevel: nextYearLevel,
          gradeLevel: student.gradeLevel,
          academicYear: activeAcademicYear.year,
          reason: 'Automatic promotion based on academic year',
        });

        promotedCount++;
      }
    } catch (error) {
      errorCount++;
      errors.push({
        studentId: student.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      console.error(`Error processing student ${student.id}:`, error);
    }
  }

  // Log the auto-promotion operation
  await logAudit(userId || null, 'AUTO_PROMOTE_STUDENTS', 'SYSTEM', undefined, {
    academicYear: activeAcademicYear.year,
    semester: activeAcademicYear.semester,
    promotedCount,
    graduatedCount,
    errorCount,
    errors: errors.length > 0 ? errors : undefined,
  });

  return {
    success: true,
    promotedCount,
    graduatedCount,
    errorCount,
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Manually promotes a single student to the next year level
 * @param studentId The ID of the student to promote
 * @param userId The ID of the user triggering the promotion (for audit logging)
 * @returns Updated student record
 */
export async function promoteStudent(studentId: number, userId?: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  if (student.graduationStatus === 'Graduated') {
    throw new Error('Cannot promote a graduated student');
  }

  const { nextYearLevel, isGraduating } = getNextYearLevel(student.gradeLevel, student.yearLevel);

  if (isGraduating || !nextYearLevel) {
    // Student has graduated
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        graduationStatus: 'Graduated',
        graduatedAt: new Date(),
        status: 'Graduated',
        yearLevel: student.yearLevel, // Keep the last year level
      },
    });

    // Remove active scholarships
    await prisma.studentScholarship.deleteMany({
      where: {
        studentId: student.id,
        scholarshipStatus: 'Active',
      },
    });

    // Cancel future disbursements
    await prisma.disbursement.deleteMany({
      where: {
        studentId: student.id,
        disbursementDate: { gte: new Date() },
      },
    });

    await logAudit(userId || null, 'MANUAL_GRADUATE_STUDENT', 'STUDENT', student.id, {
      studentName: `${student.firstName} ${student.lastName}`,
      reason: 'Manual graduation',
    });

    return updated;
  } else {
    // Promote to next year level
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        yearLevel: nextYearLevel,
      },
    });

    await logAudit(userId || null, 'MANUAL_PROMOTE_STUDENT', 'STUDENT', student.id, {
      studentName: `${student.firstName} ${student.lastName}`,
      previousYearLevel: student.yearLevel,
      newYearLevel: nextYearLevel,
      reason: 'Manual promotion',
    });

    return updated;
  }
}
