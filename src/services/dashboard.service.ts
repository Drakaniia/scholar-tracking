/**
 * Dashboard Service
 * Business logic for dashboard statistics and aggregations
 */

import { prisma } from '@/lib/db';

export interface DashboardStats {
  totalStudents: number;
  totalScholarships: number;
  activeScholarships: number;
  totalApplications: number;
  pendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  totalDisbursed: number;
}

export interface RecentActivity {
  recentApplications: Array<{
    id: number;
    studentName: string;
    scholarshipName: string;
    status: string;
    dateApplied: Date;
  }>;
  upcomingDeadlines: Array<{
    id: number;
    name: string;
    applicationEnd: Date;
  }>;
}

export const dashboardService = {
  /**
   * Get admin dashboard statistics
   */
  async getAdminStats(): Promise<DashboardStats> {
    const [
      totalStudents,
      totalScholarships,
      activeScholarships,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      approvedWithScholarship,
    ] = await Promise.all([
      prisma.student.count(),
      prisma.scholarship.count(),
      prisma.scholarship.count({ where: { isActive: true } }),
      prisma.studentScholarship.count(),
      prisma.studentScholarship.count({ where: { status: 'Pending' } }),
      prisma.studentScholarship.count({ where: { status: 'Approved' } }),
      prisma.studentScholarship.count({ where: { status: 'Rejected' } }),
      prisma.studentScholarship.findMany({
        where: { status: 'Approved' },
        include: { scholarship: { select: { amount: true } } },
      }),
    ]);

    const totalDisbursed = approvedWithScholarship.reduce(
      (sum, app) => sum + (app.scholarship.amount || 0),
      0
    );

    return {
      totalStudents,
      totalScholarships,
      activeScholarships,
      totalApplications,
      pendingApplications,
      approvedApplications,
      rejectedApplications,
      totalDisbursed,
    };
  },

  /**
   * Get student dashboard statistics
   */
  async getStudentStats(studentId: number) {
    const [
      totalApplications,
      pendingApplications,
      approvedApplications,
      totalAwarded,
    ] = await Promise.all([
      prisma.studentScholarship.count({ where: { studentId } }),
      prisma.studentScholarship.count({
        where: { studentId, status: 'Pending' },
      }),
      prisma.studentScholarship.count({
        where: { studentId, status: 'Approved' },
      }),
      prisma.studentScholarship.findMany({
        where: { studentId, status: 'Approved' },
        include: { scholarship: { select: { amount: true } } },
      }),
    ]);

    const totalAwardedAmount = totalAwarded.reduce(
      (sum, app) => sum + (app.scholarship.amount || 0),
      0
    );

    return {
      totalApplications,
      pendingApplications,
      approvedApplications,
      totalAwardedAmount,
      availableScholarships: await prisma.scholarship.count({
        where: { isActive: true },
      }),
    };
  },

  /**
   * Get recent activity for admin dashboard
   */
  async getRecentActivity(): Promise<RecentActivity> {
    const [recentApplicationsRaw, upcomingDeadlines] = await Promise.all([
      prisma.studentScholarship.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { firstName: true, lastName: true } },
          scholarship: { select: { name: true } },
        },
      }),
      prisma.scholarship.findMany({
        where: {
          isActive: true,
          applicationEnd: { gte: new Date() },
        },
        take: 5,
        orderBy: { applicationEnd: 'asc' },
        select: {
          id: true,
          name: true,
          applicationEnd: true,
        },
      }),
    ]);

    const recentApplications = recentApplicationsRaw.map(app => ({
      id: app.id,
      studentName: `${app.student.firstName} ${app.student.lastName}`,
      scholarshipName: app.scholarship.name,
      status: app.status,
      dateApplied: app.dateApplied,
    }));

    return {
      recentApplications,
      upcomingDeadlines: upcomingDeadlines.filter(
        (s): s is typeof s & { applicationEnd: Date } =>
          s.applicationEnd !== null
      ),
    };
  },
};
