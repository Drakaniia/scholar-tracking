// ============================================
// STUDENT TYPES
// ============================================
export interface Student {
    id: number;
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

export interface StudentScholarship {
    id: number;
    studentId: number;
    scholarshipId: number;
    awardDate: Date;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    scholarshipStatus: string;
    createdAt: Date;
    updatedAt: Date;
    scholarship?: Scholarship;
    student?: Student;
}

export interface CreateStudentInput {
    lastName: string;
    firstName: string;
    middleInitial?: string;
    program: string;
    gradeLevel: GradeLevel;
    yearLevel: string;
    status: string;
    scholarshipId?: number | null;
    awardDate?: Date | null;
    startTerm?: string | null;
    endTerm?: string | null;
    grantAmount?: number | null;
    scholarshipStatus?: string | null;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

// ============================================
// SCHOLARSHIP TYPES
// ============================================
export type ScholarshipType = 'PAED' | 'CHED' | 'LGU';
export type ScholarshipSource = 'INTERNAL' | 'EXTERNAL';

export interface Scholarship {
    id: number;
    scholarshipName: string;
    sponsor: string;
    type: string; // Changed to string to allow custom types
    source: string; // INTERNAL or EXTERNAL
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
    type: string; // Changed to string to allow custom types
    source: string; // INTERNAL or EXTERNAL
    amount: number;
    requirements?: string;
    status: string;
}

export type UpdateScholarshipInput = Partial<CreateScholarshipInput>;

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

export const SCHOLARSHIP_SOURCES: ScholarshipSource[] = ['INTERNAL', 'EXTERNAL'] as const;

export const SCHOLARSHIP_SOURCE_LABELS: Record<ScholarshipSource, string> = {
    INTERNAL: 'Internal',
    EXTERNAL: 'External',
};

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
    studentsWithScholarships: number;
    totalScholarships: number;
    activeScholarships: number;
    totalAmountAwarded: number;
    totalDisbursed: number;
}
// ============================================
// AUTHENTICATION TYPES
// ============================================
export type UserRole = 'ADMIN' | 'STAFF' | 'VIEWER';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
    id: number;
    username: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    lastLogin?: Date;
    passwordChangedAt: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
    createdAt: Date;
    updatedAt: Date;
    sessions?: Session[];
    auditLogs?: AuditLog[];
}

export interface Session {
    id: string;
    userId: number;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    user?: User;
}

export interface AuditLog {
    id: number;
    userId?: number;
    action: string;
    resourceType?: string;
    resourceId?: number;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    createdAt: Date;
    user?: User;
}

export interface CreateUserInput {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    status?: UserStatus;
}

export type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>> & {
    password?: string;
};

export interface LoginInput {
    username: string;
    password: string;
}

export interface AuthUser {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
}

export const USER_ROLES: UserRole[] = ['ADMIN', 'STAFF', 'VIEWER'] as const;

export const USER_ROLE_LABELS: Record<UserRole, string> = {
    ADMIN: 'Administrator',
    STAFF: 'Staff Member',
    VIEWER: 'Viewer',
};

export const USER_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE', 'SUSPENDED'] as const;

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    SUSPENDED: 'Suspended',
};