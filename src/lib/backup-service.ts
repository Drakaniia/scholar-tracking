import { logAudit } from './auth';
import prisma from './prisma';

/**
 * Backup service for creating and managing data backups before critical operations
 */

export interface BackupRecord {
  id: number;
  tableName: string;
  recordId: number;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValue: Record<string, unknown>;
  createdAt: Date;
  performedBy: number | null;
  operationContext: string;
}

/**
 * Creates a backup of student scholarships before they are removed
 * @param studentId The ID of the student whose scholarships are being removed
 * @param userId The ID of the user performing the operation
 * @param context Context for the operation (e.g., 'GRADUATION', 'MANUAL_REMOVAL')
 */
export async function createScholarshipBackup(
  studentId: number,
  userId?: number,
  context: string = 'GRADUATION'
): Promise<number> {
  // Get the student's active scholarships
  const scholarships = await prisma.studentScholarship.findMany({
    where: {
      studentId,
      scholarshipStatus: { not: 'Completed' },
    },
    include: {
      scholarship: true,
    },
  });

  if (scholarships.length === 0) {
    return 0; // No scholarships to backup
  }

  // Create backup records for each scholarship
  const backupRecords = scholarships.map((scholarship) => ({
    tableName: 'student_scholarships',
    recordId: scholarship.id,
    operation: 'DELETE' as const,
    oldValue: {
      studentId: scholarship.studentId,
      scholarshipId: scholarship.scholarshipId,
      awardDate: scholarship.awardDate,
      startTerm: scholarship.startTerm,
      endTerm: scholarship.endTerm,
      grantAmount: scholarship.grantAmount.toString(), // Convert Decimal to string for JSON
      scholarshipStatus: scholarship.scholarshipStatus,
      createdAt: scholarship.createdAt,
      updatedAt: scholarship.updatedAt,
      scholarship: {
        id: scholarship.scholarship.id,
        scholarshipName: scholarship.scholarship.scholarshipName,
        sponsor: scholarship.scholarship.sponsor,
        type: scholarship.scholarship.type,
        source: scholarship.scholarship.source,
        amount: scholarship.scholarship.amount.toString(), // Convert Decimal to string for JSON
      },
    },
    performedBy: userId || null,
    operationContext: context,
  }));

  // Insert all backup records
  await prisma.$transaction(backupRecords.map((record) => prisma.backup.create({ data: record })));

  // Log audit for the backup creation
  await logAudit(userId || null, 'SCHOLARSHIP_BACKUP_CREATED', 'BACKUP', undefined, {
    studentId,
    scholarshipCount: scholarships.length,
    context,
    backupTime: new Date().toISOString(),
  });

  return scholarships.length;
}

/**
 * Creates a backup of disbursements before they are cancelled
 * @param studentId The ID of the student whose disbursements are being cancelled
 * @param userId The ID of the user performing the operation
 * @param context Context for the operation (e.g., 'GRADUATION', 'MANUAL_CANCELLATION')
 */
export async function createDisbursementBackup(
  studentId: number,
  userId?: number,
  context: string = 'GRADUATION'
): Promise<number> {
  // Get future disbursements for the student
  const disbursements = await prisma.disbursement.findMany({
    where: {
      studentId,
      disbursementDate: { gte: new Date() }, // Future disbursements only
    },
    include: {
      scholarship: true,
    },
  });

  if (disbursements.length === 0) {
    return 0; // No disbursements to backup
  }

  // Create backup records for each disbursement
  const backupRecords = disbursements.map((disbursement) => ({
    tableName: 'disbursements',
    recordId: disbursement.id,
    operation: 'DELETE' as const, // Since we're cancelling future disbursements, we're effectively deleting them
    oldValue: {
      studentId: disbursement.studentId,
      scholarshipId: disbursement.scholarshipId,
      disbursementDate: disbursement.disbursementDate,
      amount: disbursement.amount.toString(), // Convert Decimal to string for JSON
      term: disbursement.term,
      method: disbursement.method,
      remarks: disbursement.remarks,
      createdAt: disbursement.createdAt,
      updatedAt: disbursement.updatedAt,
      scholarship: {
        id: disbursement.scholarship.id,
        scholarshipName: disbursement.scholarship.scholarshipName,
        sponsor: disbursement.scholarship.sponsor,
        type: disbursement.scholarship.type,
        amount: disbursement.scholarship.amount.toString(), // Convert Decimal to string for JSON
      },
    },
    performedBy: userId || null,
    operationContext: context,
  }));

  // Insert all backup records
  await prisma.$transaction(backupRecords.map((record) => prisma.backup.create({ data: record })));

  // Log audit for the backup creation
  await logAudit(userId || null, 'DISBURSEMENT_BACKUP_CREATED', 'BACKUP', undefined, {
    studentId,
    disbursementCount: disbursements.length,
    context,
    backupTime: new Date().toISOString(),
  });

  return disbursements.length;
}

/**
 * Creates a backup of the student record before graduation
 * @param studentId The ID of the student to backup
 * @param userId The ID of the user performing the operation
 * @param context Context for the operation (e.g., 'GRADUATION', 'MANUAL_UPDATE')
 */
export async function createStudentBackup(
  studentId: number,
  userId?: number,
  context: string = 'GRADUATION'
): Promise<number> {
  // Get the student record
  const student = await prisma.student.findUnique({
    where: { id: studentId },
  });

  if (!student) {
    throw new Error(`Student with ID ${studentId} not found`);
  }

  // Create backup record for the student
  const backupRecord = {
    tableName: 'students',
    recordId: student.id,
    operation: 'UPDATE' as const, // We're updating the graduation status
    oldValue: {
      createdAt: student.createdAt,
      program: student.program,
      status: student.status,
      id: student.id,
      updatedAt: student.updatedAt,
      yearLevel: student.yearLevel,
      firstName: student.firstName,
      gradeLevel: student.gradeLevel,
      lastName: student.lastName,
      middleInitial: student.middleInitial,
      birthDate: student.birthDate,
      graduatedAt: student.graduatedAt,
      graduationStatus: student.graduationStatus,
      isArchived: student.isArchived,
    },
    performedBy: userId || null,
    operationContext: context,
  };

  // Insert the backup record
  await prisma.backup.create({ data: backupRecord });

  // Log audit for the backup creation
  await logAudit(userId || null, 'STUDENT_BACKUP_CREATED', 'BACKUP', undefined, {
    studentId,
    context,
    backupTime: new Date().toISOString(),
  });

  return 1;
}

/**
 * Validates that required backup tables exist in the database
 */
export async function validateBackupTables(): Promise<boolean> {
  try {
    // Check if the backup table exists by trying to query it
    await prisma.backup.count({ take: 0 });
    return true;
  } catch (error) {
    console.error('Backup table validation failed:', error);
    return false;
  }
}

/**
 * Creates a comprehensive backup before a major operation
 * @param studentId The ID of the student to backup
 * @param userId The ID of the user performing the operation
 * @param context Context for the operation
 */
export async function createComprehensiveBackup(
  studentId: number,
  userId?: number,
  context: string = 'GRADUATION'
): Promise<{
  studentBackup: number;
  scholarshipBackup: number;
  disbursementBackup: number;
}> {
  // Create all backups separately since they need to be executed in sequence
  const studentBackup = await createStudentBackup(studentId, userId, context);
  const scholarshipBackup = await createScholarshipBackup(studentId, userId, context);
  const disbursementBackup = await createDisbursementBackup(studentId, userId, context);

  return {
    studentBackup,
    scholarshipBackup,
    disbursementBackup,
  };
}
