import prisma from './prisma';

/**
 * Validation service for ensuring data integrity in the scholarship tracking system
 */

export interface ValidationIssue {
  entity: string;
  id: number | string;
  field: string;
  issue: string;
  severity: 'error' | 'warning';
}

/**
 * Validates student graduation status consistency
 * Checks that students marked as 'Graduated' have proper graduation dates and vice versa
 */
export async function validateStudentGraduationConsistency(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Find students marked as graduated but without graduation date
  const graduatedWithoutDate = await prisma.student.findMany({
    where: {
      graduationStatus: 'Graduated',
      graduatedAt: null,
    },
    select: { id: true },
  });

  for (const student of graduatedWithoutDate) {
    issues.push({
      entity: 'student',
      id: student.id,
      field: 'graduatedAt',
      issue: 'Student marked as graduated but has no graduation date',
      severity: 'error',
    });
  }

  // Find students with graduation date but not marked as graduated
  const datedWithoutStatus = await prisma.student.findMany({
    where: {
      graduatedAt: { not: null },
      graduationStatus: { not: 'Graduated' },
    },
    select: { id: true },
  });

  for (const student of datedWithoutStatus) {
    issues.push({
      entity: 'student',
      id: student.id,
      field: 'graduationStatus',
      issue: 'Student has graduation date but is not marked as graduated',
      severity: 'warning',
    });
  }

  return issues;
}

/**
 * Validates scholarship consistency for graduated students
 * Checks that graduated students don't have active scholarships
 */
export async function validateGraduatedStudentScholarships(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Find graduated students with active scholarships
  const graduatedWithActiveScholarships = await prisma.student.findMany({
    where: {
      graduationStatus: 'Graduated',
    },
    include: {
      scholarships: {
        where: {
          scholarshipStatus: 'Active',
        },
      },
    },
  });

  for (const student of graduatedWithActiveScholarships) {
    if (student.scholarships.length > 0) {
      for (const scholarship of student.scholarships) {
        issues.push({
          entity: 'student_scholarship',
          id: scholarship.id,
          field: 'scholarshipStatus',
          issue: `Graduated student (${student.id}) still has active scholarship (${scholarship.scholarshipId})`,
          severity: 'error',
        });
      }
    }
  }

  return issues;
}

/**
 * Validates disbursement consistency for graduated students
 * Checks that graduated students don't have future disbursements
 */
export async function validateGraduatedStudentDisbursements(): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  // Find graduated students with future disbursements
  const graduatedWithFutureDisbursements = await prisma.student.findMany({
    where: {
      graduationStatus: 'Graduated',
    },
    include: {
      disbursements: {
        where: {
          disbursementDate: { gte: new Date() }, // Future disbursements
        },
      },
    },
  });

  for (const student of graduatedWithFutureDisbursements) {
    if (student.disbursements.length > 0) {
      for (const disbursement of student.disbursements) {
        issues.push({
          entity: 'disbursement',
          id: disbursement.id,
          field: 'disbursementDate',
          issue: `Graduated student (${student.id}) still has future disbursement scheduled for ${disbursement.disbursementDate}`,
          severity: 'error',
        });
      }
    }
  }

  return issues;
}

/**
 * Runs all validation checks
 */
export async function runAllValidations(): Promise<{
  totalIssues: number;
  issues: ValidationIssue[];
}> {
  const [graduationConsistency, scholarshipConsistency, disbursementConsistency] =
    await Promise.all([
      validateStudentGraduationConsistency(),
      validateGraduatedStudentScholarships(),
      validateGraduatedStudentDisbursements(),
    ]);

  const allIssues = [
    ...graduationConsistency,
    ...scholarshipConsistency,
    ...disbursementConsistency,
  ];

  return {
    totalIssues: allIssues.length,
    issues: allIssues,
  };
}

/**
 * Fixes common data integrity issues
 * This function will attempt to fix identified issues automatically
 */
export async function fixDataIntegrityIssues(): Promise<{
  fixedIssues: number;
  remainingIssues: ValidationIssue[];
}> {
  let fixedIssues = 0;
  const issues = await runAllValidations();

  // Fix graduation status consistency issues
  for (const issue of issues.issues) {
    if (issue.entity === 'student' && issue.field === 'graduatedAt' && issue.severity === 'error') {
      // Set graduation date to current date for students marked as graduated but without date
      await prisma.student.update({
        where: { id: issue.id as number },
        data: { graduatedAt: new Date() },
      });
      fixedIssues++;
    }
  }

  // Fix graduated student scholarship issues
  for (const issue of issues.issues) {
    if (issue.entity === 'student_scholarship' && issue.severity === 'error') {
      // Update scholarship status to completed for graduated students
      await prisma.studentScholarship.update({
        where: { id: issue.id as number },
        data: { scholarshipStatus: 'Completed' },
      });
      fixedIssues++;
    }
  }

  // Fix graduated student disbursement issues
  for (const issue of issues.issues) {
    if (issue.entity === 'disbursement' && issue.severity === 'error') {
      // Delete future disbursements for graduated students
      await prisma.disbursement.delete({
        where: { id: issue.id as number },
      });
      fixedIssues++;
    }
  }

  // Run validation again to see remaining issues
  const remaining = await runAllValidations();

  return {
    fixedIssues,
    remainingIssues: remaining.issues,
  };
}
