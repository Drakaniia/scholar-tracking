/**
 * Scholarship Constants
 * Scholarship types and categories
 */

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

export const EXTERNAL_CATEGORY_INFO = {
    CHED: 'Commission on Higher Education',
    TESDA: 'Technical Education and Skills Development Authority',
    TDP: 'Tertiary Development Program',
    LGU: 'Local Government Unit',
    Other: 'Other External Source',
} as const;

// Extract types for type safety
export type ScholarshipType = keyof typeof SCHOLARSHIP_TYPE_INFO;
export type ExternalCategory = keyof typeof EXTERNAL_CATEGORY_INFO;
