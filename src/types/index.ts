// ============================================
// STUDENT TYPES
// ============================================
export interface Student {
    id: number;
    studentNo: string;
    fullName: string;
    program: string;
    yearLevel: string;
    email: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    applications?: Application[];
}

export interface CreateStudentInput {
    studentNo: string;
    fullName: string;
    program: string;
    yearLevel: string;
    email: string;
    status: string;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

// ============================================
// SCHOLARSHIP TYPES
// ============================================
export interface Scholarship {
    id: number;
    scholarshipName: string;
    sponsor: string;
    type: string;
    amount: number;
    requirements: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    applications?: Application[];
}

export interface CreateScholarshipInput {
    scholarshipName: string;
    sponsor: string;
    type: string;
    amount: number;
    requirements?: string;
    status: string;
}

export type UpdateScholarshipInput = Partial<CreateScholarshipInput>;

// ============================================
// APPLICATION TYPES
// ============================================
export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Application {
    id: number;
    applicationDate: Date;
    status: ApplicationStatus;
    remarks: string | null;
    studentId: number;
    scholarshipId: number;
    createdAt: Date;
    updatedAt: Date;
    student?: Student;
    scholarship?: Scholarship;
    award?: Award;
}

export interface CreateApplicationInput {
    applicationDate: Date;
    studentId: number;
    scholarshipId: number;
    remarks?: string;
}

export interface UpdateApplicationInput {
    status?: ApplicationStatus;
    remarks?: string;
}

// ============================================
// AWARD TYPES
// ============================================
export interface Award {
    id: number;
    awardDate: Date;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    applicationId: number;
    createdAt: Date;
    updatedAt: Date;
    application?: Application;
    disbursements?: Disbursement[];
}

export interface CreateAwardInput {
    awardDate: Date;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    applicationId: number;
}

export type UpdateAwardInput = Partial<CreateAwardInput>;

// ============================================
// DISBURSEMENT TYPES
// ============================================
export interface Disbursement {
    id: number;
    disbursementDate: Date;
    amount: number;
    term: string;
    method: string;
    awardId: number;
    createdAt: Date;
    updatedAt: Date;
    award?: Award;
}

export interface CreateDisbursementInput {
    disbursementDate: Date;
    amount: number;
    term: string;
    method: string;
    awardId: number;
}

export type UpdateDisbursementInput = Partial<CreateDisbursementInput>;

// ============================================
// ENUM VALUES
// ============================================
export const YEAR_LEVELS = [
    '1st Year',
    '2nd Year',
    '3rd Year',
    '4th Year',
    '5th Year',
] as const;

export const SCHOLARSHIP_TYPES = ['Internal', 'External'] as const;

export const APPLICATION_STATUSES = [
    'Pending',
    'Approved',
    'Rejected',
] as const;

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
    pendingApplications: number;
    approvedApplications: number;
    totalAmountAwarded: number;
}
