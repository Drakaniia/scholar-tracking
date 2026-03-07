import prisma from './prisma';
import { GradeLevel, YEAR_LEVELS } from '@/types';
import { logAudit } from './auth';
import { createScholarshipBackup, createDisbursementBackup, createStudentBackup } from './backup-service';

/**
 * Checks if a student has completed their current education level and graduated
 * @param student The student to check (with gradeLevel and yearLevel)
 * @returns boolean indicating if the student has graduated
 */
export function hasStudentGraduated(student: { gradeLevel: string; yearLevel: string }): boolean {
  const gradeLevel = student.gradeLevel as GradeLevel;
  const { yearLevel } = student;
  
  // Get the last year level for the student's education level
  const yearLevels = YEAR_LEVELS[gradeLevel];
  if (!yearLevels || yearLevels.length === 0) {
    return false;
  }
  
  // Check if the student is in their final year level
  const lastYearLevel = yearLevels[yearLevels.length - 1];
  return yearLevel.toUpperCase() === lastYearLevel.toUpperCase();
}

/**
 * Updates the graduation status of a student
 * @param studentId The ID of the student to update
 * @param graduated Whether the student has graduated
 * @param userId The ID of the user making the change (for audit logging)
 * @returns Updated student record
 */
export async function updateStudentGraduationStatus(studentId: number, graduated: boolean, userId?: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { firstName: true, lastName: true, gradeLevel: true, yearLevel: true, graduationStatus: true }
  });
  
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }
  
  // Create a backup of the student record before updating
  await createStudentBackup(studentId, userId, 'GRADUATION');
  
  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: {
      graduationStatus: graduated ? 'Graduated' : 'Active',
      graduatedAt: graduated ? new Date() : null,
    },
  });
  
  // Log audit
  await logAudit(
    userId || null,
    `UPDATE_STUDENT_GRADUATION_STATUS`,
    'STUDENT',
    studentId,
    {
      previousStatus: student.graduationStatus,
      newStatus: graduated ? 'Graduated' : 'Active',
      studentName: `${student.firstName} ${student.lastName}`,
      gradeLevel: student.gradeLevel,
      yearLevel: student.yearLevel
    }
  );
  
  return updatedStudent;
}

/**
 * Removes scholarships from students who have graduated with audit logging
 * @param studentId The ID of the student to process
 * @param userId The ID of the user making the change (for audit logging)
 * @returns Number of scholarships removed
 */
export async function removeScholarshipsFromGraduatedStudent(studentId: number, userId?: number) {
  // First, create a backup of the scholarships that will be removed
  await createScholarshipBackup(studentId, userId, 'GRADUATION');
  
  // Then, get the scholarships that will be removed for audit logging
  const scholarshipsToRemove = await prisma.studentScholarship.findMany({
    where: {
      studentId,
      scholarshipStatus: { not: 'Completed' }, // Don't delete already completed scholarships
    },
    include: {
      scholarship: true
    }
  });
  
  // Perform the deletion in a transaction to ensure data integrity
  const result = await prisma.$transaction(async (tx) => {
    // Delete student scholarships
    const deleteResult = await tx.studentScholarship.deleteMany({
      where: {
        studentId,
        scholarshipStatus: { not: 'Completed' },
      },
    });
    
    // Log audit for each scholarship removed
    for (const studentScholarship of scholarshipsToRemove) {
      await logAudit(
        userId || null,
        `REMOVE_STUDENT_SCHOLARSHIP`,
        'STUDENT_SCHOLARSHIP',
        studentScholarship.id,
        {
          studentId,
          scholarshipId: studentScholarship.scholarshipId,
          scholarshipName: studentScholarship.scholarship.scholarshipName,
          reason: 'Student Graduated',
          removedAt: new Date().toISOString()
        }
      );
    }
    
    return deleteResult;
  });
  
  return result.count;
}

/**
 * Cancels future disbursements for graduated students
 * @param studentId The ID of the student to process
 * @param userId The ID of the user making the change (for audit logging)
 * @returns Number of disbursements cancelled
 */
export async function cancelFutureDisbursementsForGraduatedStudent(studentId: number, userId?: number) {
  // First, create a backup of the disbursements that will be cancelled
  await createDisbursementBackup(studentId, userId, 'GRADUATION');
  
  // Get future disbursements that need to be cancelled
  const futureDisbursements = await prisma.disbursement.findMany({
    where: {
      studentId,
      disbursementDate: { gte: new Date() }, // Future disbursements only
    },
    include: {
      scholarship: true
    }
  });
  
  // Perform the cancellation in a transaction to ensure data integrity
  const result = await prisma.$transaction(async (tx) => {
    // Update future disbursements to cancelled status (if we have a status field) or delete them
    // For now, we'll delete them as they're no longer needed for graduated students
    const deleteResult = await tx.disbursement.deleteMany({
      where: {
        studentId,
        disbursementDate: { gte: new Date() },
      },
    });
    
    // Log audit for each disbursement cancelled
    for (const disbursement of futureDisbursements) {
      await logAudit(
        userId || null,
        `CANCEL_FUTURE_DISBURSEMENT`,
        'DISBURSEMENT',
        disbursement.id,
        {
          studentId,
          scholarshipId: disbursement.scholarshipId,
          scholarshipName: disbursement.scholarship.scholarshipName,
          amount: Number(disbursement.amount),
          date: disbursement.disbursementDate.toISOString(),
          reason: 'Student Graduated',
          cancelledAt: new Date().toISOString()
        }
      );
    }
    
    return deleteResult;
  });
  
  return result.count;
}

/**
 * Processes all students to check for graduation and update scholarship status accordingly
 * @param userId The ID of the user running the process (for audit logging)
 * @returns Object with statistics about the operation
 */
export async function processGraduatingStudents(userId?: number) {
  // Find students who are in their final year level but still have active scholarships
  const students = await prisma.student.findMany({
    where: {
      isArchived: false,
      graduationStatus: { not: 'Graduated' },
    },
    include: {
      scholarships: {
        where: {
          scholarshipStatus: 'Active',
        },
      },
    },
  });
  
  let processedCount = 0;
  let updatedStudentCount = 0;
  let removedScholarshipCount = 0;
  let cancelledDisbursementCount = 0;
  const errors: { studentId: number; error: string }[] = [];
  
  for (const student of students) {
    try {
      if (hasStudentGraduated(student as { gradeLevel: string; yearLevel: string })) {
        // Update graduation status
        await updateStudentGraduationStatus(student.id, true, userId);
        updatedStudentCount++;
        
        // Remove active scholarships
        if (student.scholarships.length > 0) {
          const removedCount = await removeScholarshipsFromGraduatedStudent(student.id, userId);
          removedScholarshipCount += removedCount;
        }
        
        // Cancel any future disbursements
        const cancelledDisbursements = await cancelFutureDisbursementsForGraduatedStudent(student.id, userId);
        cancelledDisbursementCount += cancelledDisbursements;
      }
    } catch (error) {
      // Log the error but continue processing other students
      errors.push({
        studentId: student.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error(`Error processing student ${student.id}:`, error);
    }
    processedCount++;
  }
  
  // Log the graduation processing operation
  await logAudit(
    userId || null,
    `PROCESS_GRADUATING_STUDENTS`,
    'SYSTEM',
    undefined,
    {
      processedStudents: processedCount,
      updatedStudents: updatedStudentCount,
      removedScholarships: removedScholarshipCount,
      cancelledDisbursements: cancelledDisbursementCount,
      errorsCount: errors.length,
      errors: errors.length > 0 ? errors : undefined
    }
  );
  
  return {
    processedStudents: processedCount,
    updatedStudents: updatedStudentCount,
    removedScholarships: removedScholarshipCount,
    cancelledDisbursements: cancelledDisbursementCount,
    errors,
  };
}

/**
 * Processes students who are transferring, repeating, or moving between levels
 * @param studentId The ID of the student to process
 * @param newGradeLevel The new grade level for the student
 * @param newYearLevel The new year level for the student
 * @param userId The ID of the user making the change (for audit logging)
 * @param reason The reason for the change (e.g., 'TRANSFER', 'REPEAT', 'PROMOTION')
 * @returns Updated student record
 */
export async function processStudentLevelChange(
  studentId: number, 
  newGradeLevel: GradeLevel, 
  newYearLevel: string, 
  userId?: number, 
  reason: 'TRANSFER' | 'REPEAT' | 'PROMOTION' | 'GRADUATION' = 'PROMOTION'
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { firstName: true, lastName: true, gradeLevel: true, yearLevel: true, graduationStatus: true }
  });
  
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }
  
  // Check if this change results in graduation
  const isGraduating = hasStudentGraduated({ gradeLevel: newGradeLevel, yearLevel: newYearLevel });
  
  // Determine the new graduation status
  let newGraduationStatus: string = 'Active';
  let newGraduatedAt: Date | null = null;
  
  if (reason === 'GRADUATION' || isGraduating) {
    newGraduationStatus = 'Graduated';
    newGraduatedAt = new Date();
  } else if (reason === 'TRANSFER') {
    // For transfers, maintain the current status unless explicitly graduating
    newGraduationStatus = student.graduationStatus || 'Active';
    newGraduatedAt = student.graduationStatus === 'Graduated' ? new Date() : null;
  } else {
    // For repeat or promotion, student is active
    newGraduationStatus = 'Active';
    newGraduatedAt = null;
  }
  
  // Update the student record
  const updatedStudent = await prisma.student.update({
    where: { id: studentId },
    data: {
      gradeLevel: newGradeLevel,
      yearLevel: newYearLevel,
      graduationStatus: newGraduationStatus,
      graduatedAt: newGraduatedAt,
    },
  });
  
  // If student is graduating, remove scholarships and cancel future disbursements
  if (newGraduationStatus === 'Graduated') {
    await removeScholarshipsFromGraduatedStudent(studentId, userId);
    await cancelFutureDisbursementsForGraduatedStudent(studentId, userId);
  }
  
  // Log audit for the level change
  await logAudit(
    userId || null,
    `STUDENT_LEVEL_CHANGE`,
    'STUDENT',
    studentId,
    {
      previousGradeLevel: student.gradeLevel,
      previousYearLevel: student.yearLevel,
      newGradeLevel,
      newYearLevel,
      previousGraduationStatus: student.graduationStatus,
      newGraduationStatus,
      reason,
      studentName: `${student.firstName} ${student.lastName}`,
    }
  );
  
  return updatedStudent;
}

/**
 * Checks if a student is eligible for disbursement based on graduation status
 * @param studentId The ID of the student to check
 * @returns boolean indicating if the student is eligible for disbursement
 */
export async function isStudentEligibleForDisbursement(studentId: number): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });
  
  if (!student) {
    return false;
  }
  
  // Student is not eligible if they have graduated
  return student.graduationStatus !== 'Graduated';
}

/**
 * Updates student to the next year level within their current education level
 * @param studentId The ID of the student to update
 * @param nextYearLevel The next year level to assign
 * @param userId The ID of the user making the change (for audit logging)
 * @returns Updated student record
 */
export async function updateStudentToNextYearLevel(studentId: number, nextYearLevel: string, userId?: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });
  
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }
  
  // Check if the student is moving to the next year level in the same education level
  const currentYearLevels = YEAR_LEVELS[student.gradeLevel as GradeLevel];
  if (currentYearLevels) {
    const currentIndex = currentYearLevels.findIndex(level => level.toUpperCase() === student.yearLevel.toUpperCase());
    const nextIndex = currentYearLevels.findIndex(level => level.toUpperCase() === nextYearLevel.toUpperCase());
    
    if (nextIndex <= currentIndex) {
      // If moving to an earlier year level or the same year level, check if it's the last year
      if (hasStudentGraduated({ ...student, yearLevel: nextYearLevel })) {
        // Student is moving to a final year level, mark as graduated
        return await processStudentLevelChange(
          studentId,
          student.gradeLevel as GradeLevel,
          nextYearLevel,
          userId,
          'GRADUATION'
        );
      }
    }
  }
  
  return await processStudentLevelChange(
    studentId,
    student.gradeLevel as GradeLevel,
    nextYearLevel,
    userId,
    'PROMOTION'
  );
}

/**
 * Promotes student to the next education level (e.g., from Elementary to Junior High)
 * @param studentId The ID of the student to promote
 * @param nextGradeLevel The next education level to assign
 * @param nextYearLevel The next year level to assign
 * @param userId The ID of the user making the change (for audit logging)
 * @returns Updated student record
 */
export async function promoteStudentToNextEducationLevel(
  studentId: number, 
  nextGradeLevel: GradeLevel, 
  nextYearLevel: string,
  userId?: number
) {
  return await processStudentLevelChange(
    studentId,
    nextGradeLevel,
    nextYearLevel,
    userId,
    'PROMOTION'
  );
}

/**
 * Handles student transfer to another institution/program
 * @param studentId The ID of the student to transfer
 * @param userId The ID of the user making the change (for audit logging)
 * @returns Updated student record
 */
export async function transferStudent(studentId: number, userId?: number) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { gradeLevel: true, yearLevel: true, graduationStatus: true }
  });
  
  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }
  
  // For transfer, we maintain the current grade/year level but can update graduation status if needed
  return await processStudentLevelChange(
    studentId,
    student.gradeLevel as GradeLevel,
    student.yearLevel,
    userId,
    'TRANSFER'
  );
}

/**
 * Handles student repeating a year level
 * @param studentId The ID of the student to repeat
 * @param newGradeLevel The grade level to repeat in
 * @param newYearLevel The year level to repeat in
 * @param userId The ID of the user making the change (for audit logging)
 * @returns Updated student record
 */
export async function repeatStudentYearLevel(
  studentId: number, 
  newGradeLevel: GradeLevel, 
  newYearLevel: string,
  userId?: number
) {
  return await processStudentLevelChange(
    studentId,
    newGradeLevel,
    newYearLevel,
    userId,
    'REPEAT'
  );
}