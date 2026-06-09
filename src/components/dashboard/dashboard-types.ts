import type { DashboardStats } from '@/types';

export interface DashboardData {
  readonly stats: DashboardStats;
  readonly recentStudents: readonly DashboardRecentStudent[];
  readonly charts: {
    readonly studentsByGradeLevel: readonly DashboardGradeLevelCount[];
    readonly scholarshipsByType: readonly DashboardScholarshipTypeCount[];
    readonly monthlyTrends: readonly DashboardMonthlyTrend[];
  };
}

export interface DashboardRecentStudent {
  readonly id: number;
  readonly lastName: string;
  readonly firstName: string;
  readonly middleInitial: string | null;
  readonly gradeLevel: string;
  readonly yearLevel: string;
  readonly scholarships: readonly DashboardStudentScholarship[];
  readonly updatedAt: string;
}

export interface DashboardStudentScholarship {
  readonly scholarshipStatus: string;
  readonly scholarship: {
    readonly scholarshipName: string;
    readonly type: string;
  };
}

export interface DashboardGradeLevelCount {
  readonly gradeLevel: string;
  readonly _count: {
    readonly id: number;
  };
}

export interface DashboardScholarshipTypeCount {
  readonly type: string;
  readonly _count: {
    readonly id: number;
  };
}

export interface DashboardMonthlyTrend {
  readonly name: string;
  readonly awarded: number;
  readonly disbursed: number;
  readonly balance: number;
}

export interface DashboardRecentAward {
  readonly id: number;
  readonly studentName: string;
  readonly scholarshipName: string;
  readonly scholarshipCount: number;
  readonly scholarshipNames: readonly string[];
  readonly type: string;
  readonly date: string;
  readonly status: 'active' | 'pending' | 'completed';
}

export interface StudentChartDatum {
  readonly name: string;
  readonly students: number;
}

export interface ScholarshipTypeDatum {
  readonly name: string;
  readonly value: number;
}

export const EMPTY_DASHBOARD_STATS = {
  totalStudents: 0,
  studentsWithScholarships: 0,
  totalScholarships: 0,
  activeScholarships: 0,
  totalAmountAwarded: 0,
  totalDisbursed: 0,
} satisfies DashboardStats;
