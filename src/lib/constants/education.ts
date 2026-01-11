/**
 * Education Constants
 * Education levels and year level definitions
 */

export const EDUCATION_LEVEL_INFO = {
  'Grade School': {
    description: 'Elementary education (Grades 1-6)',
    yearLevels: [
      'Grade 1',
      'Grade 2',
      'Grade 3',
      'Grade 4',
      'Grade 5',
      'Grade 6',
    ],
  },
  'Junior High': {
    description: 'Junior High School (Grades 7-10)',
    yearLevels: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
  },
  'Senior High': {
    description: 'Senior High School (Grades 11-12)',
    yearLevels: ['Grade 11', 'Grade 12'],
  },
  College: {
    description: 'Tertiary/Higher Education',
    yearLevels: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
  },
} as const;

// Extract types for type safety
export type EducationLevel = keyof typeof EDUCATION_LEVEL_INFO;
export type YearLevel =
  (typeof EDUCATION_LEVEL_INFO)[EducationLevel]['yearLevels'][number];
