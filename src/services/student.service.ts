/**
 * Student Service
 * Business logic for student-related operations
 */

import { prisma } from '@/lib/db';
import type { Student, Prisma } from '@prisma/client';

export interface StudentFilters {
    educationLevel?: string;
    yearLevel?: string;
    course?: string;
    search?: string;
}

export interface CreateStudentData {
    firstName: string;
    middleName?: string;
    lastName: string;
    yearLevel: string;
    course: string;
    tuitionFee: number;
    educationLevel: string;
    userId?: number;
}

export interface UpdateStudentData extends Partial<CreateStudentData> { }

export const studentService = {
    /**
     * Get all students with optional filters
     */
    async getAll(filters?: StudentFilters): Promise<Student[]> {
        const where: Prisma.StudentWhereInput = {};

        if (filters?.educationLevel) {
            where.educationLevel = filters.educationLevel;
        }

        if (filters?.yearLevel) {
            where.yearLevel = filters.yearLevel;
        }

        if (filters?.course) {
            where.course = { contains: filters.course, mode: 'insensitive' };
        }

        if (filters?.search) {
            where.OR = [
                { firstName: { contains: filters.search, mode: 'insensitive' } },
                { lastName: { contains: filters.search, mode: 'insensitive' } },
                { course: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        return prisma.student.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });
    },

    /**
     * Get student by ID
     */
    async getById(id: number): Promise<Student | null> {
        return prisma.student.findUnique({
            where: { id },
        });
    },

    /**
     * Get student by user ID
     */
    async getByUserId(userId: number): Promise<Student | null> {
        return prisma.student.findUnique({
            where: { userId },
        });
    },

    /**
     * Get student with their scholarships
     */
    async getWithScholarships(id: number) {
        return prisma.student.findUnique({
            where: { id },
            include: {
                scholarships: {
                    include: {
                        scholarship: true,
                    },
                },
            },
        });
    },

    /**
     * Create a new student
     */
    async create(data: CreateStudentData): Promise<Student> {
        return prisma.student.create({
            data: {
                firstName: data.firstName,
                middleName: data.middleName || null,
                lastName: data.lastName,
                yearLevel: data.yearLevel,
                course: data.course,
                tuitionFee: data.tuitionFee,
                educationLevel: data.educationLevel,
                userId: data.userId || null,
            },
        });
    },

    /**
     * Update a student
     */
    async update(id: number, data: UpdateStudentData): Promise<Student> {
        return prisma.student.update({
            where: { id },
            data,
        });
    },

    /**
     * Delete a student
     */
    async delete(id: number): Promise<Student> {
        return prisma.student.delete({
            where: { id },
        });
    },

    /**
     * Count students with optional filters
     */
    async count(filters?: StudentFilters): Promise<number> {
        const where: Prisma.StudentWhereInput = {};

        if (filters?.educationLevel) {
            where.educationLevel = filters.educationLevel;
        }

        return prisma.student.count({ where });
    },
};
