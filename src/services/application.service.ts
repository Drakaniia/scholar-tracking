/**
 * Application Service
 * Business logic for student-scholarship applications
 */

import { prisma } from '@/lib/db';
import type { StudentScholarship, Prisma } from '@prisma/client';

export interface ApplicationFilters {
    status?: string;
    studentId?: number;
    scholarshipId?: number;
}

export interface CreateApplicationData {
    studentId: number;
    scholarshipId: number;
    status?: string;
    remarks?: string;
}

export interface UpdateApplicationData {
    status?: string;
    remarks?: string;
    dateApproved?: Date | string;
}

export const applicationService = {
    /**
     * Get all applications with optional filters
     */
    async getAll(filters?: ApplicationFilters) {
        const where: Prisma.StudentScholarshipWhereInput = {};

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.studentId) {
            where.studentId = filters.studentId;
        }

        if (filters?.scholarshipId) {
            where.scholarshipId = filters.scholarshipId;
        }

        return prisma.studentScholarship.findMany({
            where,
            include: {
                student: true,
                scholarship: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    },

    /**
     * Get application by ID
     */
    async getById(id: number) {
        return prisma.studentScholarship.findUnique({
            where: { id },
            include: {
                student: true,
                scholarship: true,
            },
        });
    },

    /**
     * Get applications for a specific student
     */
    async getByStudentId(studentId: number) {
        return prisma.studentScholarship.findMany({
            where: { studentId },
            include: {
                scholarship: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    },

    /**
     * Get applications for a specific scholarship
     */
    async getByScholarshipId(scholarshipId: number) {
        return prisma.studentScholarship.findMany({
            where: { scholarshipId },
            include: {
                student: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    },

    /**
     * Create a new application
     */
    async create(data: CreateApplicationData): Promise<StudentScholarship> {
        return prisma.studentScholarship.create({
            data: {
                studentId: data.studentId,
                scholarshipId: data.scholarshipId,
                status: data.status || 'Pending',
                remarks: data.remarks || null,
            },
        });
    },

    /**
     * Update an application
     */
    async update(id: number, data: UpdateApplicationData): Promise<StudentScholarship> {
        const updateData: Prisma.StudentScholarshipUpdateInput = { ...data };

        if (data.dateApproved) {
            updateData.dateApproved = new Date(data.dateApproved);
        }

        // Auto-set dateApproved when status changes to Approved
        if (data.status === 'Approved' && !data.dateApproved) {
            updateData.dateApproved = new Date();
        }

        return prisma.studentScholarship.update({
            where: { id },
            data: updateData,
        });
    },

    /**
     * Delete an application
     */
    async delete(id: number): Promise<StudentScholarship> {
        return prisma.studentScholarship.delete({
            where: { id },
        });
    },

    /**
     * Count applications with optional filters
     */
    async count(filters?: ApplicationFilters): Promise<number> {
        const where: Prisma.StudentScholarshipWhereInput = {};

        if (filters?.status) {
            where.status = filters.status;
        }

        if (filters?.studentId) {
            where.studentId = filters.studentId;
        }

        return prisma.studentScholarship.count({ where });
    },

    /**
     * Check if a student has already applied for a scholarship
     */
    async exists(studentId: number, scholarshipId: number): Promise<boolean> {
        const existing = await prisma.studentScholarship.findUnique({
            where: {
                studentId_scholarshipId: {
                    studentId,
                    scholarshipId,
                },
            },
        });
        return !!existing;
    },
};
