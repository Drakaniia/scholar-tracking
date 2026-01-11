// ============================================
// STUDENT TYPES
// ============================================
export interface Student {
  id: number;
  firstName: string;
  middleName: string | null;
  lastName: string;
  yearLevel: string;
  course: string;
  tuitionFee: number;
  educationLevel: string;
  createdAt: Date;
  updatedAt: Date;
  scholarships?: StudentScholarship[];
}

export interface CreateStudentInput {
  firstName: string;
  middleName?: string;
  lastName: string;
  yearLevel: string;
  course: string;
  tuitionFee: number;
  educationLevel: string;
}

export type UpdateStudentInput = Partial<CreateStudentInput>;

// ============================================
// SCHOLARSHIP TYPES
// ============================================
export interface Scholarship {
  id: number;
  name: string;
  description: string | null;
  type: 'Internal' | 'External';
  category: string | null;
  amount: number;
  eligibility: string | null;
  applicationStart: Date | null;
  applicationEnd: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  students?: StudentScholarship[];
}

export interface CreateScholarshipInput {
  name: string;
  description?: string;
  type: 'Internal' | 'External';
  category?: string;
  amount: number;
  eligibility?: string;
  applicationStart?: Date;
  applicationEnd?: Date;
  isActive?: boolean;
}

export type UpdateScholarshipInput = Partial<CreateScholarshipInput>;

// ============================================
// STUDENT-SCHOLARSHIP (APPLICATION) TYPES
// ============================================
export type ApplicationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Expired';

export interface StudentScholarship {
  id: number;
  studentId: number;
  scholarshipId: number;
  status: ApplicationStatus;
  dateApplied: Date;
  dateApproved: Date | null;
  remarks: string | null;
  createdAt: Date;
  updatedAt: Date;
  student?: Student;
  scholarship?: Scholarship;
}

export interface CreateApplicationInput {
  studentId: number;
  scholarshipId: number;
  remarks?: string;
}

export interface UpdateApplicationInput {
  status?: ApplicationStatus;
  remarks?: string;
}

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

export const EDUCATION_LEVELS = [
  'Grade School',
  'Junior High',
  'Senior High',
  'College',
] as const;

export const SCHOLARSHIP_TYPES = ['Internal', 'External'] as const;

export const EXTERNAL_CATEGORIES = [
  'CHED',
  'TESDA',
  'TDP',
  'LGU',
  'Other',
] as const;

export const APPLICATION_STATUSES = [
  'Pending',
  'Approved',
  'Rejected',
  'Expired',
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
