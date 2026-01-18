// ============================================
// STUDENT TYPES
// ============================================
export interface Student {
    id: number;
    studentNo: string;
    lastName: string;
    firstName: string;
    middleInitial: string | null;
    program: string;
    gradeLevel: GradeLevel;
    yearLevel: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    scholarships?: StudentScholarship[];
    fees?: StudentFees[];
    disbursements?: Disbursement[];
}

export interface CreateStudentInput {
    studentNo: string;
    lastName: string;
    firstName: string;
    middleInitial?: string;
    program: string;
    gradeLevel: GradeLevel;
    yearLevel: string;
    status: string;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

// ============================================
// SCHOLARSHIP TYPES
// ============================================
export type ScholarshipType = 'PAED' | 'CHED' | 'LGU';

export interface Scholarship {
    id: number;
    scholarshipName: string;
    sponsor: string;
    type: ScholarshipType;
    amount: number;
    requirements: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    students?: StudentScholarship[];
    disbursements?: Disbursement[];
}

export interface CreateScholarshipInput {
    scholarshipName: string;
    sponsor: string;
    type: ScholarshipType;
    amount: number;
    requirements?: string;
    status: string;
}

export type UpdateScholarshipInput = Partial<CreateScholarshipInput>;

// ============================================
// STUDENT SCHOLARSHIP TYPES (Junction)
// ============================================
export interface StudentScholarship {
    id: number;
    studentId: number;
    scholarshipId: number;
    awardDate: Date;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    status: 'Active' | 'Completed' | 'Suspended';
    remarks: string | null;
    createdAt: Date;
    updatedAt: Date;
    student?: Student;
    scholarship?: Scholarship;
}

export interface CreateStudentScholarshipInput {
    studentId: number;
    scholarshipId: number;
    awardDate: Date;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    status: 'Active' | 'Completed' | 'Suspended';
    remarks?: string;
}

export type UpdateStudentScholarshipInput = Partial<CreateStudentScholarshipInput>;

// ============================================
// DISBURSEMENT TYPES
// ============================================
export interface Disbursement {
    id: number;
    studentId: number;
    scholarshipId: number;
    disbursementDate: Date;
    amount: number;
    term: string;
    method: string;
    remarks: string | null;
    createdAt: Date;
    updatedAt: Date;
    student?: Student;
    scholarship?: Scholarship;
}

export interface CreateDisbursementInput {
    studentId: number;
    scholarshipId: number;
    disbursementDate: Date;
    amount: number;
    term: string;
    method: string;
    remarks?: string;
}

export type UpdateDisbursementInput = Partial<CreateDisbursementInput>;

// ============================================
// STUDENT FEES TYPES
// ============================================
export interface StudentFees {
    id: number;
    studentId: number;
    tuitionFee: number;
    otherFee: number;
    miscellaneousFee: number;
    laboratoryFee: number;
    amountSubsidy: number;
    percentSubsidy: number;
    term: string;
    academicYear: string;
    createdAt: Date;
    updatedAt: Date;
    student?: Student;
}

export interface CreateStudentFeesInput {
    studentId: number;
    tuitionFee: number;
    otherFee: number;
    miscellaneousFee: number;
    laboratoryFee: number;
    amountSubsidy: number;
    term: string;
    academicYear: string;
}

export type UpdateStudentFeesInput = Partial<CreateStudentFeesInput>;

// ============================================
// ENUM VALUES
// ============================================
export type GradeLevel = 'GRADE_SCHOOL' | 'JUNIOR_HIGH' | 'SENIOR_HIGH' | 'COLLEGE';

export const GRADE_LEVELS: GradeLevel[] = [
    'GRADE_SCHOOL',
    'JUNIOR_HIGH',
    'SENIOR_HIGH',
    'COLLEGE',
] as const;

export const GRADE_LEVEL_LABELS: Record<GradeLevel, string> = {
    GRADE_SCHOOL: 'Grade School',
    JUNIOR_HIGH: 'Junior High School',
    SENIOR_HIGH: 'Senior High School',
    COLLEGE: 'College',
};

export const YEAR_LEVELS: Record<GradeLevel, string[]> = {
    GRADE_SCHOOL: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'],
    JUNIOR_HIGH: ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'],
    SENIOR_HIGH: ['Grade 11', 'Grade 12'],
    COLLEGE: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'],
};

export const SCHOLARSHIP_TYPES: ScholarshipType[] = ['PAED', 'CHED', 'LGU'] as const;

export const SCHOLARSHIP_TYPE_LABELS: Record<ScholarshipType, string> = {
    PAED: 'PAED Scholarship',
    CHED: 'CHED Scholarship',
    LGU: 'LGU Scholarship',
};

export const STUDENT_SCHOLARSHIP_STATUSES = ['Active', 'Completed', 'Suspended'] as const;

export const DISBURSEMENT_METHODS = [
    'Bank Transfer',
    'Check',
    'Cash',
] as const;

// ============================================
// API RESPONSE TYPES
// ============================================
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ============================================
// DASHBOARD STATS
// ============================================
export interface DashboardStats {
    totalStudents: number;
    totalScholarships: number;
    activeScholarships: number;
    activeStudentScholarships: number;
    totalAmountAwarded: number;
    totalDisbursed: number;
}
