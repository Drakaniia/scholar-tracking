/**
 * Scholarship Service
 * Business logic for scholarship-related operations
 */

import { prisma } from '@/lib/db';
import type { Scholarship, Prisma } from '@prisma/client';

export interface ScholarshipFilters {
  type?: string;
  category?: string;
  isActive?: boolean;
  search?: string;
}

export interface CreateScholarshipData {
  name: string;
  description?: string;
  type: string;
  category?: string;
  amount: number;
  eligibility?: string;
  applicationStart?: Date | string;
  applicationEnd?: Date | string;
  isActive?: boolean;
}

export type UpdateScholarshipData = Partial<CreateScholarshipData>;

export const scholarshipService = {
  /**
   * Get all scholarships with optional filters
   */
  async getAll(filters?: ScholarshipFilters): Promise<Scholarship[]> {
    const where: Prisma.ScholarshipWhereInput = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.scholarship.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get active scholarships only
   */
  async getActive(): Promise<Scholarship[]> {
    return prisma.scholarship.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get scholarship by ID
   */
  async getById(id: number): Promise<Scholarship | null> {
    return prisma.scholarship.findUnique({
      where: { id },
    });
  },

  /**
   * Get scholarship with enrolled students
   */
  async getWithStudents(id: number) {
    return prisma.scholarship.findUnique({
      where: { id },
      include: {
        students: {
          include: {
            student: true,
          },
        },
      },
    });
  },

  /**
   * Create a new scholarship
   */
  async create(data: CreateScholarshipData): Promise<Scholarship> {
    return prisma.scholarship.create({
      data: {
        name: data.name,
        description: data.description || null,
        type: data.type,
        category: data.category || null,
        amount: data.amount,
        eligibility: data.eligibility || null,
        applicationStart: data.applicationStart
          ? new Date(data.applicationStart)
          : null,
        applicationEnd: data.applicationEnd
          ? new Date(data.applicationEnd)
          : null,
        isActive: data.isActive ?? true,
      },
    });
  },

  /**
   * Update a scholarship
   */
  async update(id: number, data: UpdateScholarshipData): Promise<Scholarship> {
    const updateData: Prisma.ScholarshipUpdateInput = { ...data };

    if (data.applicationStart) {
      updateData.applicationStart = new Date(data.applicationStart);
    }
    if (data.applicationEnd) {
      updateData.applicationEnd = new Date(data.applicationEnd);
    }

    return prisma.scholarship.update({
      where: { id },
      data: updateData,
    });
  },

  /**
   * Delete a scholarship
   */
  async delete(id: number): Promise<Scholarship> {
    return prisma.scholarship.delete({
      where: { id },
    });
  },

  /**
   * Count scholarships with optional filters
   */
  async count(filters?: ScholarshipFilters): Promise<number> {
    const where: Prisma.ScholarshipWhereInput = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    return prisma.scholarship.count({ where });
  },

  /**
   * Get total amount of active scholarships
   */
  async getTotalAmount(filters?: { isActive?: boolean }): Promise<number> {
    const result = await prisma.scholarship.aggregate({
      _sum: { amount: true },
      where:
        filters?.isActive !== undefined
          ? { isActive: filters.isActive }
          : undefined,
    });
    return result._sum.amount || 0;
  },
};
