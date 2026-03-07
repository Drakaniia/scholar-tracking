import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, PUT, PATCH } from './route';
import { NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
    default: {
        scholarship: {
            findUnique: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('@/lib/auth', () => ({
    getSession: vi.fn(),
}));

vi.mock('@/lib/query-optimizer', () => ({
    queryOptimizer: {
        invalidatePattern: vi.fn(),
        invalidate: vi.fn(),
    },
}));

import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { queryOptimizer } from '@/lib/query-optimizer';

describe('Scholarship API - [id] endpoint', () => {
    const mockScholarship = {
        id: 1,
        scholarshipName: 'Test Scholarship',
        sponsor: 'Test Sponsor',
        type: 'PAEB',
        source: 'INTERNAL',
        eligibleGradeLevels: 'COLLEGE',
        eligiblePrograms: 'BS Education',
        amount: new Prisma.Decimal(10000),
        requirements: 'Minimum GWA of 1.5',
        status: 'Active',
        isArchived: false,
        grantType: 'FULL',
        coversTuition: true,
        coversMiscellaneous: true,
        coversLaboratory: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        students: [],
        disbursements: [],
    };

    const mockAdminSession = {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('GET /api/scholarships/[id]', () => {
        it('should return scholarship when found', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.findUnique).mockResolvedValue(mockScholarship);

            const request = new NextRequest('http://localhost:3000/api/scholarships/1');
            const params = Promise.resolve({ id: '1' });

            const response = await GET(request, { params });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.data).toMatchObject({
                id: mockScholarship.id,
                scholarshipName: mockScholarship.scholarshipName,
                sponsor: mockScholarship.sponsor,
                type: mockScholarship.type,
                source: mockScholarship.source,
            });
        });

        it('should return 404 when scholarship not found', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.findUnique).mockResolvedValue(null);

            const request = new NextRequest('http://localhost:3000/api/scholarships/999');
            const params = Promise.resolve({ id: '999' });

            const response = await GET(request, { params });
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Scholarship not found');
        });

        it('should handle database errors gracefully', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.findUnique).mockRejectedValue(new Error('Database error'));

            const request = new NextRequest('http://localhost:3000/api/scholarships/1');
            const params = Promise.resolve({ id: '1' });

            const response = await GET(request, { params });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Failed to fetch scholarship');
        });
    });

    describe('PUT /api/scholarships/[id] - Update scholarship', () => {
        it('should update scholarship successfully with valid data', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.update).mockResolvedValue({
                ...mockScholarship,
                scholarshipName: 'Updated Scholarship',
                amount: new Prisma.Decimal(15000),
            });

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PUT',
                body: JSON.stringify({
                    scholarshipName: 'Updated Scholarship',
                    amount: 15000,
                }),
            });
            const params = Promise.resolve({ id: '1' });

            const response = await PUT(request, { params });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Scholarship updated successfully');
            expect(prisma.scholarship.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: expect.objectContaining({
                    scholarshipName: 'Updated Scholarship',
                    amount: 15000,
                }),
            });
        });

        it('should return 403 when user is not admin', async () => {
            vi.mocked(getSession).mockResolvedValue({ ...mockAdminSession, role: 'STAFF' });

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PUT',
                body: JSON.stringify({ scholarshipName: 'Updated' }),
            });
            const params = Promise.resolve({ id: '1' });

            const response = await PUT(request, { params });
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return 403 when user is not authenticated', async () => {
            vi.mocked(getSession).mockResolvedValue(null);

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PUT',
                body: JSON.stringify({ scholarshipName: 'Updated' }),
            });
            const params = Promise.resolve({ id: '1' });

            const response = await PUT(request, { params });
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Unauthorized');
        });

        it('should update only provided fields (partial update)', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.update).mockResolvedValue(mockScholarship);

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PUT',
                body: JSON.stringify({
                    status: 'Inactive',
                    grantType: 'TUITION_ONLY',
                }),
            });
            const params = Promise.resolve({ id: '1' });

            const response = await PUT(request, { params });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);

            // Verify only provided fields are in the update data
            const callArgs = vi.mocked(prisma.scholarship.update).mock.calls[0][0];
            expect(callArgs.data).toEqual({
                status: 'Inactive',
                grantType: 'TUITION_ONLY',
            });
        });

        it('should handle grant type updates correctly', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.update).mockResolvedValue(mockScholarship);

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PUT',
                body: JSON.stringify({
                    grantType: 'MISC_ONLY',
                    coversTuition: false,
                    coversMiscellaneous: true,
                    coversLaboratory: false,
                }),
            });
            const params = Promise.resolve({ id: '1' });

            const response = await PUT(request, { params });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);

            const callArgs = vi.mocked(prisma.scholarship.update).mock.calls[0][0];
            expect(callArgs.data).toEqual({
                grantType: 'MISC_ONLY',
                coversTuition: false,
                coversMiscellaneous: true,
                coversLaboratory: false,
            });
        });

        it('should handle invalid scholarship ID', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.update).mockRejectedValue(new Error('Record not found'));

            const request = new NextRequest('http://localhost:3000/api/scholarships/invalid', {
                method: 'PUT',
                body: JSON.stringify({ scholarshipName: 'Test' }),
            });
            const params = Promise.resolve({ id: 'invalid' });

            const response = await PUT(request, { params });
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.success).toBe(false);
        });

        it('should invalidate cache after successful update', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.update).mockResolvedValue(mockScholarship);

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PUT',
                body: JSON.stringify({ status: 'Active' }),
            });
            const params = Promise.resolve({ id: '1' });

            await PUT(request, { params });

            expect(queryOptimizer.invalidatePattern).toHaveBeenCalledWith('scholarships-list');
            expect(queryOptimizer.invalidate).toHaveBeenCalledWith('scholarships-counts');
        });
    });

    describe('PATCH /api/scholarships/[id] - Archive/Unarchive', () => {
        it('should archive scholarship successfully', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.update).mockResolvedValue({
                ...mockScholarship,
                isArchived: true,
            });

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PATCH',
                body: JSON.stringify({ action: 'archive' }),
            });
            const params = Promise.resolve({ id: '1' });

            const response = await PATCH(request, { params });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Scholarship archived successfully');
            expect(prisma.scholarship.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isArchived: true },
            });
        });

        it('should unarchive scholarship successfully', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);
            vi.mocked(prisma.scholarship.update).mockResolvedValue({
                ...mockScholarship,
                isArchived: false,
            });

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PATCH',
                body: JSON.stringify({ action: 'unarchive' }),
            });
            const params = Promise.resolve({ id: '1' });

            const response = await PATCH(request, { params });
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(data.message).toBe('Scholarship unarchived successfully');
            expect(prisma.scholarship.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isArchived: false },
            });
        });

        it('should return 400 for invalid action', async () => {
            vi.mocked(getSession).mockResolvedValue(mockAdminSession);

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PATCH',
                body: JSON.stringify({ action: 'delete' }),
            });
            const params = Promise.resolve({ id: '1' });

            const response = await PATCH(request, { params });
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Invalid action. Use "archive" or "unarchive".');
        });

        it('should return 403 when user is not admin', async () => {
            vi.mocked(getSession).mockResolvedValue({ ...mockAdminSession, role: 'VIEWER' });

            const request = new NextRequest('http://localhost:3000/api/scholarships/1', {
                method: 'PATCH',
                body: JSON.stringify({ action: 'archive' }),
            });
            const params = Promise.resolve({ id: '1' });

            const response = await PATCH(request, { params });
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.success).toBe(false);
            expect(data.error).toBe('Unauthorized');
        });
    });
});
