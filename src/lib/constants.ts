// Application Constants

export const APP_NAME = 'ScholarTrack';
export const APP_DESCRIPTION = 'Scholarship Tracking System';
export const APP_VERSION = '1.0.0';

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// Status Colors
export const STATUS_COLORS = {
 Pending: {
 bg: 'bg-yellow-100',
 text: 'text-yellow-800',
 },
 Approved: {
 bg: 'bg-green-100',
 text: 'text-green-800',
 },
 Rejected: {
 bg: 'bg-red-100',
 text: 'text-red-800',
 },
 Expired: {
 bg: 'bg-gray-100',
 text: 'text-gray-800',
 },
} as const;

// Education Level Descriptions
export const EDUCATION_LEVEL_INFO = {
 'Grade School': {
 description: 'Elementary education (Grades 1-6)',
 yearLevels: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
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

// Scholarship Type Descriptions
export const SCHOLARSHIP_TYPE_INFO = {
 Internal: {
 description: 'School-based scholarships (Cash Assistance)',
 color: 'text-blue-600',
 bgColor: 'bg-blue-100',
 },
 External: {
 description: 'Government or other external scholarships',
 color: 'text-purple-600',
 bgColor: 'bg-purple-100',
 },
} as const;

// External Category Full Names
export const EXTERNAL_CATEGORY_INFO = {
 CHED: 'Commission on Higher Education',
 TESDA: 'Technical Education and Skills Development Authority',
 TDP: 'Tertiary Development Program',
 LGU: 'Local Government Unit',
 Other: 'Other External Source',
} as const;
