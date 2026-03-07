import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hasStudentGraduated,
  updateStudentGraduationStatus,
  removeScholarshipsFromGraduatedStudent,
  cancelFutureDisbursementsForGraduatedStudent,
  processGraduatingStudents,
  updateStudentToNextYearLevel,
  promoteStudentToNextEducationLevel
} from '@/lib/graduation-service';
import { Student } from '@/types';

// Mock Prisma client
vi.mock('@/lib/prisma', () => {
  const mockPrisma = {
    student: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    studentScholarship: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    disbursement: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    backup: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn(mockPrisma)),
  };

  return {
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

// Mock auth module
vi.mock('@/lib/auth', () => ({
  logAudit: vi.fn(),
}));

import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/auth';

type MockStudent = Partial<Student> & {
  id: number;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  yearLevel: string;
  graduationStatus: string;
};

describe('graduation-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasStudentGraduated', () => {
    it('should return true for students in their final year level', () => {
      expect(hasStudentGraduated({ gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 6' })).toBe(true);
      expect(hasStudentGraduated({ gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 10' })).toBe(true);
      expect(hasStudentGraduated({ gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 12' })).toBe(true);
      expect(hasStudentGraduated({ gradeLevel: 'COLLEGE', yearLevel: '5th Year' })).toBe(true);
    });

    it('should return false for students not in their final year level', () => {
      expect(hasStudentGraduated({ gradeLevel: 'GRADE_SCHOOL', yearLevel: 'Grade 5' })).toBe(false);
      expect(hasStudentGraduated({ gradeLevel: 'JUNIOR_HIGH', yearLevel: 'Grade 9' })).toBe(false);
      expect(hasStudentGraduated({ gradeLevel: 'SENIOR_HIGH', yearLevel: 'Grade 11' })).toBe(false);
      expect(hasStudentGraduated({ gradeLevel: 'COLLEGE', yearLevel: '4th Year' })).toBe(false);
    });
  });

  describe('updateStudentGraduationStatus', () => {
    it('should update student graduation status and create audit log', async () => {
      const mockStudent = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 12',
        graduationStatus: 'Active',
      };
      
      const updatedStudent = {
        ...mockStudent,
        graduationStatus: 'Graduated',
        graduatedAt: new Date(),
      };

      (prisma.student.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudent);
      (prisma.student.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedStudent);

      const result = await updateStudentGraduationStatus(1, true, 123);

      expect((prisma.student.findUnique as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
        where: { id: 1 },
        select: { firstName: true, lastName: true, gradeLevel: true, yearLevel: true, graduationStatus: true }
      });

      expect((prisma.student.update as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
        where: { id: 1 },
        data: {
          graduationStatus: 'Graduated',
          graduatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual(updatedStudent);
      expect((logAudit as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
        123,
        'UPDATE_STUDENT_GRADUATION_STATUS',
        'STUDENT',
        1,
        expect.objectContaining({
          previousStatus: 'Active',
          newStatus: 'Graduated',
          studentName: 'John Doe',
          gradeLevel: 'SENIOR_HIGH',
          yearLevel: 'Grade 12'
        })
      ]);
    });
  });

  describe('removeScholarshipsFromGraduatedStudent', () => {
    it('should remove active scholarships and create audit logs', async () => {
      const mockScholarships = [
        {
          id: 1,
          studentId: 1,
          scholarshipId: 10,
          scholarshipStatus: 'Active',
          scholarship: { scholarshipName: 'Test Scholarship' }
        }
      ];

      (prisma.studentScholarship.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockScholarships);
      (prisma.studentScholarship.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

      const result = await removeScholarshipsFromGraduatedStudent(1, 123);

      expect((prisma.studentScholarship.findMany as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
        where: {
          studentId: 1,
          scholarshipStatus: { not: 'Completed' },
        },
        include: {
          scholarship: true
        }
      });

      expect((prisma.studentScholarship.deleteMany as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
        where: {
          studentId: 1,
          scholarshipStatus: { not: 'Completed' },
        },
      });

      expect(result).toBe(1);
      expect((logAudit as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([
        123,
        'REMOVE_STUDENT_SCHOLARSHIP',
        'STUDENT_SCHOLARSHIP',
        1,
        expect.objectContaining({
          studentId: 1,
          scholarshipId: 10,
          scholarshipName: 'Test Scholarship',
          reason: 'Student Graduated'
        })
      ]);
    });
  });

  describe('cancelFutureDisbursementsForGraduatedStudent', () => {
    it('should cancel future disbursements and create audit logs', async () => {
      const mockDisbursements = [
        {
          id: 1,
          studentId: 1,
          scholarshipId: 10,
          disbursementDate: new Date('2025-12-31'),
          amount: { toString: () => '5000' },
          scholarship: { scholarshipName: 'Test Scholarship' }
        }
      ];

      (prisma.disbursement.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockDisbursements);
      (prisma.disbursement.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

      const result = await cancelFutureDisbursementsForGraduatedStudent(1, 123);

      expect(prisma.disbursement.findMany).toHaveBeenCalledWith({
        where: {
          studentId: 1,
          disbursementDate: { gte: expect.any(Date) },
        },
        include: {
          scholarship: true
        }
      });

      expect(result).toBe(1);
      expect(logAudit).toHaveBeenCalledWith(
        123,
        'CANCEL_FUTURE_DISBURSEMENT',
        'DISBURSEMENT',
        1,
        expect.objectContaining({
          studentId: 1,
          scholarshipId: 10,
          scholarshipName: 'Test Scholarship',
          amount: 5000,
          reason: 'Student Graduated'
        })
      );
    });
  });

  describe('processGraduatingStudents', () => {
    it('should process all graduating students and update their status', async () => {
      const mockStudents = [
        {
          id: 1,
          firstName: 'John',
          lastName: 'Doe',
          gradeLevel: 'SENIOR_HIGH',
          yearLevel: 'Grade 12', // Final year
          isArchived: false,
          graduationStatus: 'Active',
          scholarships: [{ id: 1, scholarshipStatus: 'Active' }]
        },
        {
          id: 2,
          firstName: 'Jane',
          lastName: 'Smith',
          gradeLevel: 'JUNIOR_HIGH',
          yearLevel: 'Grade 8', // Not final year
          isArchived: false,
          graduationStatus: 'Active',
          scholarships: []
        }
      ];

      (prisma.student.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudents);
      (prisma.student.update as ReturnType<typeof vi.fn>).mockImplementation(({ data, where }: { data: MockStudent; where: { id: number } }) => ({ ...mockStudents[0], ...data, id: where.id }));
      (prisma.studentScholarship.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 });

      const result = await processGraduatingStudents(123);

      // Only the first student should be processed as graduated (in final year)
      expect(prisma.student.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          graduationStatus: 'Graduated',
          graduatedAt: expect.any(Date),
        },
      });

      // The second student should not be updated since they're not in their final year
      expect(prisma.student.update).toHaveBeenCalledTimes(1);

      expect(result).toEqual({
        processedStudents: 2,
        updatedStudents: 1,
        removedScholarships: 1,
        cancelledDisbursements: 0,
        errors: [],
      });
    });
  });

  describe('updateStudentToNextYearLevel', () => {
    it('should update student to next year level', async () => {
      const mockStudent = {
        id: 1,
        gradeLevel: 'SENIOR_HIGH',
        yearLevel: 'Grade 11',
      };

      (prisma.student.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockStudent);

      await updateStudentToNextYearLevel(1, 'Grade 12', 123);

      expect((prisma.student.findUnique as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({ where: { id: 1 } });
    });
  });

  describe('promoteStudentToNextEducationLevel', () => {
    it('should promote student to next education level', async () => {
      const updatedStudent = {
        id: 1,
        gradeLevel: 'COLLEGE',
        yearLevel: '1st Year',
        graduationStatus: 'Active',
        graduatedAt: null,
      };

      (prisma.student.update as ReturnType<typeof vi.fn>).mockResolvedValue(updatedStudent);

      const result = await promoteStudentToNextEducationLevel(1, 'COLLEGE', '1st Year', 123);

      expect((prisma.student.update as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
        where: { id: 1 },
        data: {
          gradeLevel: 'COLLEGE',
          yearLevel: '1st Year',
          graduationStatus: 'Active',
          graduatedAt: null,
        },
      });

      expect(result).toEqual(updatedStudent);
    });
  });
});