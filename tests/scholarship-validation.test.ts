import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma client module
vi.mock('@/lib/prisma', () => {
  const findUniqueStudent = vi.fn();
  const findUniqueScholarship = vi.fn();
  const findManyScholarship = vi.fn();

  return {
    default: {
      student: { findUnique: findUniqueStudent },
      scholarship: { findUnique: findUniqueScholarship, findMany: findManyScholarship },
    },
    prisma: {
      student: { findUnique: findUniqueStudent },
      scholarship: { findUnique: findUniqueScholarship, findMany: findManyScholarship },
    },
    __mocks: {
      findUniqueStudent,
      findUniqueScholarship,
      findManyScholarship,
    }
  };
});

// Mock getGradeLevelForStudent behavior to control mapping
vi.mock('@/lib/validations', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/validations')>();
  return {
    ...original,
    getGradeLevelForStudent: vi.fn(),
  };
});

import { validateStudentScholarshipEligibility, validateMultipleStudentScholarshipEligibility } from '@/lib/scholarship-validation';
import * as prismaModule from '@/lib/prisma';
import * as validations from '@/lib/validations';

const prismaMocks = (prismaModule as unknown as { __mocks: { findUniqueStudent: ReturnType<typeof vi.fn>; findUniqueScholarship: ReturnType<typeof vi.fn>; findManyScholarship: ReturnType<typeof vi.fn> } }).__mocks;

describe('scholarship-validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateStudentScholarshipEligibility', () => {
    it('should throw if student is not found', async () => {
      prismaMocks.findUniqueStudent.mockResolvedValueOnce(null);
      prismaMocks.findUniqueScholarship.mockResolvedValueOnce({ id: 1, scholarshipName: 'Test', eligibleGradeLevels: 'GRADE 11, GRADE 12' });

      await expect(validateStudentScholarshipEligibility(123, 1)).rejects.toThrowError('Student with ID 123 not found');
    });

    it('should throw if scholarship is not found', async () => {
      prismaMocks.findUniqueStudent.mockResolvedValueOnce({ id: 1, gradeLevel: 'SENIOR_HIGH' });
      prismaMocks.findUniqueScholarship.mockResolvedValueOnce(null);

      await expect(validateStudentScholarshipEligibility(1, 999)).rejects.toThrowError('Scholarship with ID 999 not found');
    });

    it('should pass when at least one mapped grade level matches eligible list (case-insensitive)', async () => {
      prismaMocks.findUniqueStudent.mockResolvedValueOnce({ id: 1, gradeLevel: 'Senior_High' });
      prismaMocks.findUniqueScholarship.mockResolvedValueOnce({ id: 10, scholarshipName: 'SHS Support', eligibleGradeLevels: 'grade 11, Grade 12' });

      (validations.getGradeLevelForStudent as ReturnType<typeof vi.fn>).mockReturnValue(['SENIOR_HIGH', 'SENIOR HIGH SCHOOL', 'GRADE 11', 'GRADE 12']);

      await expect(validateStudentScholarshipEligibility(1, 10)).resolves.toBeUndefined();
    });

    it('should throw with informative message when not eligible', async () => {
      prismaMocks.findUniqueStudent.mockResolvedValueOnce({ id: 1, gradeLevel: 'COLLEGE' });
      prismaMocks.findUniqueScholarship.mockResolvedValueOnce({ id: 10, scholarshipName: 'Basic Ed Grant', eligibleGradeLevels: 'GRADE SCHOOL, JUNIOR_HIGH' });

      (validations.getGradeLevelForStudent as ReturnType<typeof vi.fn>).mockReturnValue(['COLLEGE', 'UNIVERSITY']);

      await expect(validateStudentScholarshipEligibility(1, 10)).rejects.toThrowError(
        "Student grade level 'COLLEGE' is not eligible for scholarship 'Basic Ed Grant' which is only available for: GRADE SCHOOL, JUNIOR_HIGH"
      );
    });

    it('should handle extra spaces and mixed casing in eligibleGradeLevels', async () => {
      prismaMocks.findUniqueStudent.mockResolvedValueOnce({ id: 1, gradeLevel: 'JUNIOR_HIGH' });
      prismaMocks.findUniqueScholarship.mockResolvedValueOnce({ id: 2, scholarshipName: 'JHS Grant', eligibleGradeLevels: '  junior high ,  Grade 7  , GRADE 8 ' });

      (validations.getGradeLevelForStudent as ReturnType<typeof vi.fn>).mockReturnValue(['JUNIOR_HIGH', 'JUNIOR HIGH SCHOOL', 'GRADE 7', 'GRADE 8']);

      await expect(validateStudentScholarshipEligibility(1, 2)).resolves.toBeUndefined();
    });
  });

  describe('validateMultipleStudentScholarshipEligibility', () => {
    it('should throw if student not found', async () => {
      prismaMocks.findUniqueStudent.mockResolvedValueOnce(null);

      await expect(validateMultipleStudentScholarshipEligibility(1, [1, 2])).rejects.toThrowError('Student with ID 1 not found');
    });

    it('should validate multiple scholarships and pass when all eligible', async () => {
      prismaMocks.findUniqueStudent.mockResolvedValueOnce({ id: 2, gradeLevel: 'GRADE_SCHOOL' });
      prismaMocks.findManyScholarship.mockResolvedValueOnce([
        { id: 1, scholarshipName: 'Elem A', eligibleGradeLevels: 'ELEMENTARY' },
        { id: 2, scholarshipName: 'Elem B', eligibleGradeLevels: 'GRADE_SCHOOL, JUNIOR_HIGH' },
      ]);

      (validations.getGradeLevelForStudent as ReturnType<typeof vi.fn>).mockReturnValue(['GRADE_SCHOOL', 'ELEMENTARY']);

      await expect(validateMultipleStudentScholarshipEligibility(2, [1, 2])).resolves.toBeUndefined();
    });

    it('should throw when any scholarship is not eligible and include scholarship name and levels', async () => {
      prismaMocks.findUniqueStudent.mockResolvedValueOnce({ id: 3, gradeLevel: 'COLLEGE' });
      prismaMocks.findManyScholarship.mockResolvedValueOnce([
        { id: 5, scholarshipName: 'TESDA TVET', eligibleGradeLevels: 'SENIOR_HIGH' },
        { id: 6, scholarshipName: 'CHED StuFAP', eligibleGradeLevels: 'COLLEGE' },
      ]);

      (validations.getGradeLevelForStudent as ReturnType<typeof vi.fn>).mockReturnValue(['COLLEGE']);

      await expect(validateMultipleStudentScholarshipEligibility(3, [5, 6])).rejects.toThrowError(
        "Student grade level 'COLLEGE' is not eligible for scholarship 'TESDA TVET' which is only available for: SENIOR_HIGH"
      );
    });

    it('should treat eligibleGradeLevels comma parsing robustly (multiple spaces)', async () => {
      prismaMocks.findUniqueStudent.mockResolvedValueOnce({ id: 4, gradeLevel: 'SENIOR_HIGH' });
      prismaMocks.findManyScholarship.mockResolvedValueOnce([
        { id: 8, scholarshipName: 'SHS Grant', eligibleGradeLevels: '  SENIOR HIGH SCHOOL  ,  grade 11  ' },
      ]);

      (validations.getGradeLevelForStudent as ReturnType<typeof vi.fn>).mockReturnValue(['SENIOR_HIGH', 'SENIOR HIGH SCHOOL', 'GRADE 11']);

      await expect(validateMultipleStudentScholarshipEligibility(4, [8])).resolves.toBeUndefined();
    });
  });
});
