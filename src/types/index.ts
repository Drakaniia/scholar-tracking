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
  birthDate?: Date | null;
  isArchived: boolean;
  termType: TermType;
  transitionDecision?: StudentTransitionDecision | null;
  transitionDecisionAt?: Date | null;
  separatedAt?: Date | null;
  separationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
  academicRecords?: StudentAcademicRecord[];
  scholarships?: StudentScholarship[];
  fees?: StudentFees[];
  disbursements?: Disbursement[];
}

export interface StudentAcademicRecord {
  id: number;
  studentId: number;
  academicYearId: number | null;
  academicYear: string;
  gradeLevel: GradeLevel;
  yearLevel: string;
  program: string;
  termType: TermType;
  status: string;
  outcome: StudentAcademicOutcome | null;
  decision: StudentTransitionDecision | null;
  nextGradeLevel: GradeLevel | null;
  nextYearLevel: string | null;
  nextProgram: string | null;
  nextTermType: TermType | null;
  isCurrent: boolean;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  student?: Student;
}

export interface StudentScholarship {
  id: number;
  studentId: number;
  scholarshipId: number;
  academicYearId?: number | null;
  awardDate: Date;
  startTerm: string;
  endTerm: string;
  grantAmount: number;
  grantType: GrantType;
  scholarshipStatus: string;
  createdAt: Date;
  updatedAt: Date;
  academicYearRel?: AcademicYear | null;
  scholarship?: Scholarship;
  student?: Student;
}

export interface AcademicYear {
  id: number;
  year: string;
  startDate: string | Date;
  endDate: string | Date;
  semester: string;
  isActive: boolean;
  promotionDate: string | Date | null;
  promotionProcessedAt: string | Date | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface AcademicYearInput {
  year: string;
  startDate: string;
  endDate: string;
  semester: string;
  isActive?: boolean;
  promotionDate?: string | null;
}

export interface CreateStudentInput {
  lastName: string;
  firstName: string;
  middleInitial?: string;
  program: string;
  gradeLevel: GradeLevel;
  yearLevel: string;
  status: string;
  birthDate?: Date | null;
  termType?: TermType;
  scholarshipId?: number | null;
  awardDate?: Date | null;
  startTerm?: string | null;
  endTerm?: string | null;
  grantAmount?: number | null;
  grantType?: GrantType;
  scholarshipStatus?: string | null;
  scholarships?: Array<{
    id?: number;
    scholarshipId: number;
    academicYearId?: number | null;
    awardDate: Date;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    grantType?: GrantType;
    scholarshipStatus: string;
  }>;
  fees?: StudentFeesInput;
}

export interface CreateStudentsInput {
  readonly students: CreateStudentInput[];
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

// ============================================
// SCHOLARSHIP TYPES
// ============================================
export type ScholarshipType = 'PAEB' | 'CHED' | 'LGU';
export type ScholarshipSource = 'INTERNAL' | 'EXTERNAL';
export type GrantType = 'FULL' | 'TUITION_ONLY' | 'MISC_ONLY' | 'LAB_ONLY' | 'NONE';
export type ScholarshipTerm = '1ST' | '2ND' | '3RD';

export const GRANT_TYPES: GrantType[] = [
  'FULL',
  'TUITION_ONLY',
  'MISC_ONLY',
  'LAB_ONLY',
  'NONE',
] as const;

export const GRANT_TYPE_LABELS: Record<GrantType, string> = {
  FULL: 'Full Grant (Cash + Tuition)',
  TUITION_ONLY: 'Free Tuition Only',
  MISC_ONLY: 'Miscellaneous Fees Only',
  LAB_ONLY: 'Laboratory Fees Only',
  NONE: 'None (Honorific Only)',
};

export const SCHOLARSHIP_TERMS: ScholarshipTerm[] = ['1ST', '2ND', '3RD'] as const;

export const SCHOLARSHIP_TERM_LABELS: Record<ScholarshipTerm, string> = {
  '1ST': '1st Semester',
  '2ND': '2nd Semester',
  '3RD': '3rd Semester',
};

export interface Scholarship {
  id: number;
  scholarshipName: string;
  sponsor: string;
  type: string; // Changed to string to allow custom types
  source: string; // INTERNAL or EXTERNAL
  eligibleGradeLevels: string; // Comma-separated grade levels
  eligiblePrograms?: string | null; // Comma-separated programs (optional)
  amount: number;
  requirements: string | null;
  status: string;
  isArchived: boolean;
  grantType: GrantType;
  coversTuition: boolean;
  coversMiscellaneous: boolean;
  coversLaboratory: boolean;
  coversOther: boolean;
  otherFeeName?: string | null;
  tuitionFee: number;
  miscellaneousFee: number;
  laboratoryFee: number;
  otherFee: number;
  amountSubsidy: number;
  percentSubsidy: number;
  coveredTerms: string; // Comma-separated term codes: 1ST,2ND,3RD
  students?: StudentScholarship[];
  disbursements?: Disbursement[];
}

export interface CreateScholarshipInput {
  scholarshipName: string;
  sponsor: string;
  type: string; // Changed to string to allow custom types
  source: string; // INTERNAL or EXTERNAL
  eligibleGradeLevels: string; // Comma-separated grade levels
  eligiblePrograms?: string | null; // Comma-separated programs (optional)
  amount: number;
  requirements?: string;
  status: string;
  grantType?: GrantType;
  coversTuition?: boolean;
  coversMiscellaneous?: boolean;
  coversLaboratory?: boolean;
  coversOther?: boolean;
  otherFeeName?: string | null;
  tuitionFee?: number;
  miscellaneousFee?: number;
  laboratoryFee?: number;
  otherFee?: number;
  amountSubsidy?: number;
  percentSubsidy?: number;
  coveredTerms?: string;
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
// FEE FORM TYPES
// ============================================

// Fee data for form submission (manual input only)
export interface StudentFeesInput {
  tuitionFee?: number;
  otherFee?: number;
  miscellaneousFee?: number;
  laboratoryFee?: number;
}

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

// Term Type for academic calendar
export type TermType = 'SEMESTER' | 'TRIMESTER';

export const TERM_TYPES: TermType[] = ['SEMESTER', 'TRIMESTER'] as const;

export const TERM_TYPE_LABELS: Record<TermType, string> = {
  SEMESTER: 'Semester (2 terms/year)',
  TRIMESTER: 'Trimester (3 semesters/year)',
};

export const TERM_FORMATS = {
  SEMESTER: {
    prefix: 'Semester',
    termsPerYear: 2,
    labels: ['1st', '2nd'] as const,
  },
  TRIMESTER: {
    prefix: 'Semester',
    termsPerYear: 3,
    labels: ['1st', '2nd', '3rd'] as const,
  },
} as const;

export const SCHOLARSHIP_TYPES: ScholarshipType[] = ['PAEB', 'CHED', 'LGU'] as const;

export const SCHOLARSHIP_TYPE_LABELS: Record<ScholarshipType, string> = {
  PAEB: 'PAEB Scholarship',
  CHED: 'CHED Scholarship',
  LGU: 'LGU Scholarship',
};

export const SCHOLARSHIP_SOURCES: ScholarshipSource[] = ['INTERNAL', 'EXTERNAL'] as const;

export const SCHOLARSHIP_SOURCE_LABELS: Record<ScholarshipSource, string> = {
  INTERNAL: 'Internal',
  EXTERNAL: 'External',
};

export const DISBURSEMENT_METHODS = ['Bank Transfer', 'Check', 'Cash'] as const;

export type StudentTransitionDecision =
  | 'CONTINUE_NEXT_LEVEL'
  | 'CONTINUE_SENIOR_HIGH'
  | 'CONTINUE_COLLEGE'
  | 'COMPLETED_JHS'
  | 'GRADUATED_SHS'
  | 'GRADUATED_COLLEGE'
  | 'TRANSFERRED_OUT'
  | 'WITHDRAWN'
  | 'RETAINED';

export const STUDENT_TRANSITION_DECISIONS: StudentTransitionDecision[] = [
  'CONTINUE_NEXT_LEVEL',
  'CONTINUE_SENIOR_HIGH',
  'CONTINUE_COLLEGE',
  'COMPLETED_JHS',
  'GRADUATED_SHS',
  'GRADUATED_COLLEGE',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
  'RETAINED',
] as const;

export const STUDENT_TRANSITION_DECISION_LABELS: Record<StudentTransitionDecision, string> = {
  CONTINUE_NEXT_LEVEL: 'Continue to Next Level',
  CONTINUE_SENIOR_HIGH: 'Continue to Grade 11',
  CONTINUE_COLLEGE: 'Continue to College',
  COMPLETED_JHS: 'Completed Junior High',
  GRADUATED_SHS: 'Graduated Senior High',
  GRADUATED_COLLEGE: 'Graduated College',
  TRANSFERRED_OUT: 'Transferred Out',
  WITHDRAWN: 'Withdrawn',
  RETAINED: 'Retained',
};

export type StudentAcademicOutcome =
  | 'PROMOTED'
  | 'RETAINED'
  | 'COMPLETED_JHS'
  | 'GRADUATED_SHS'
  | 'GRADUATED_COLLEGE'
  | 'TRANSFERRED_OUT'
  | 'WITHDRAWN'
  | 'SKIPPED';

export const SEPARATED_STUDENT_STATUSES = [
  'Completed JHS',
  'Graduated SHS',
  'Graduated',
  'Transferred Out',
  'Withdrawn',
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
// STUDENT FILTER OPTIONS
// ============================================
export interface StudentFilterOptions {
  programs: string[];
  programCounts: Record<string, number>;
  gradeLevelCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  scholarshipCounts: Record<string, number>;
  studentsWithoutScholarship: number;
  total: number;
  scholarships?: Array<{ id: number; scholarshipName: string; source: string }>;
  facetTotals?: {
    gradeLevel: number;
    program: number;
    status: number;
    scholarship: number;
  };
  filteredTotal?: number;
  dynamicScholarshipCounts?: Record<string, number>;
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
