/**
 * Integration Test Script for Scholarship API
 * 
 * This script tests the scholarship CRUD operations by making actual HTTP requests
 * to the API endpoints.
 * 
 * Usage: npx tsx scripts/test-scholarship-api.ts
 */

import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:8080';

interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    status?: number;
}

interface Scholarship {
    id: number;
    scholarshipName: string;
    sponsor: string;
    type: string;
    source: string;
    eligibleGradeLevels: string;
    eligiblePrograms?: string | null;
    amount: number;
    requirements?: string | null;
    status: string;
    isArchived: boolean;
    grantType: string;
    coversTuition: boolean;
    coversMiscellaneous: boolean;
    coversLaboratory: boolean;
}

interface CreateScholarshipInput {
    scholarshipName: string;
    sponsor: string;
    type: string;
    source: string;
    eligibleGradeLevels: string;
    eligiblePrograms?: string | null;
    amount: number;
    requirements?: string;
    status: string;
    grantType?: string;
    coversTuition?: boolean;
    coversMiscellaneous?: boolean;
    coversLaboratory?: boolean;
}

class ScholarshipApiTester {
    private authToken: string | null = null;
    private testScholarshipId: number | null = null;
    private passedTests = 0;
    private failedTests = 0;

    constructor() {
        console.log('🎓 Scholarship API Integration Tests\n');
        console.log(`Base URL: ${BASE_URL}\n`);
    }

    private log(message: string, type: 'info' | 'success' | 'error' | 'test' = 'info') {
        const icons = {
            info: 'ℹ️',
            success: '✅',
            error: '❌',
            test: '🧪',
        };
        console.log(`${icons[type]} ${message}`);
    }

    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
        const url = `${BASE_URL}${endpoint}`;
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers,
            });

            const data = await response.json();
            return {
                success: response.ok,
                data: data as T,
                error: !response.ok ? (data as { error?: string }).error : undefined,
                status: response.status,
            };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                status: 0,
            };
        }
    }

    private async login(): Promise<boolean> {
        this.log('Attempting to login as admin...', 'info');

        try {
            const response = await fetch(`${BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin123',
                }),
            });

            if (response.ok) {
                const cookies = response.headers.getSetCookie();
                const authToken = cookies.find(c => c.includes('auth-token='));
                if (authToken) {
                    this.authToken = authToken.split('=')[1].split(';')[0];
                    this.log('Login successful', 'success');
                    return true;
                }
            }

            this.log('Login failed - using fallback auth token', 'error');
            return false;
        } catch (error) {
            this.log(`Login error: ${error instanceof Error ? error.message : 'Unknown'}`, 'error');
            return false;
        }
    }

    private getAuthHeaders(): HeadersInit {
        return this.authToken
            ? { 'Cookie': `auth-token=${this.authToken}` }
            : {};
    }

    async testCreateScholarship(): Promise<boolean> {
        this.log('Test: Create Scholarship', 'test');

        const scholarshipData: CreateScholarshipInput = {
            scholarshipName: `Test Scholarship ${Date.now()}`,
            sponsor: 'Test Organization',
            type: 'TEST',
            source: 'INTERNAL',
            eligibleGradeLevels: 'COLLEGE',
            eligiblePrograms: 'BS Education,BS Computer Science',
            amount: 10000,
            requirements: 'Minimum GWA of 1.5, enrolled in any degree program',
            status: 'Active',
            grantType: 'FULL',
            coversTuition: true,
            coversMiscellaneous: true,
            coversLaboratory: false,
        };

        const result = await this.request<Scholarship>('/api/scholarships', {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(scholarshipData),
        });

        if (result.success && result.data) {
            this.testScholarshipId = result.data.id;
            this.log(`✓ Created scholarship with ID: ${this.testScholarshipId}`, 'success');
            this.passedTests++;
            return true;
        } else {
            this.log(`✗ Failed to create scholarship: ${result.error}`, 'error');
            this.failedTests++;
            return false;
        }
    }

    async testGetScholarship(): Promise<boolean> {
        this.log('Test: Get Single Scholarship', 'test');

        if (!this.testScholarshipId) {
            this.log('✗ No scholarship ID available (create first)', 'error');
            this.failedTests++;
            return false;
        }

        const result = await this.request<Scholarship>(`/api/scholarships/${this.testScholarshipId}`);

        if (result.success && result.data) {
            this.log(`✓ Retrieved scholarship: ${result.data.scholarshipName}`, 'success');
            this.passedTests++;
            return true;
        } else {
            this.log(`✗ Failed to get scholarship: ${result.error}`, 'error');
            this.failedTests++;
            return false;
        }
    }

    async testUpdateScholarship(): Promise<boolean> {
        this.log('Test: Update Scholarship (PUT)', 'test');

        if (!this.testScholarshipId) {
            this.log('✗ No scholarship ID available (create first)', 'error');
            this.failedTests++;
            return false;
        }

        const updateData = {
            scholarshipName: 'Updated Test Scholarship',
            amount: 15000,
            status: 'Active',
            grantType: 'TUITION_ONLY',
            coversTuition: true,
            coversMiscellaneous: false,
            coversLaboratory: false,
        };

        const result = await this.request<Scholarship>(`/api/scholarships/${this.testScholarshipId}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(updateData),
        });

        if (result.success && result.data) {
            this.log(`✓ Updated scholarship: ${result.data.scholarshipName}`, 'success');
            this.log(`  - Amount: ${result.data.amount}`, 'info');
            this.log(`  - Grant Type: ${result.data.grantType}`, 'info');
            this.passedTests++;
            return true;
        } else {
            this.log(`✗ Failed to update scholarship: ${result.error}`, 'error');
            this.failedTests++;
            return false;
        }
    }

    async testPartialUpdate(): Promise<boolean> {
        this.log('Test: Partial Update (only status)', 'test');

        if (!this.testScholarshipId) {
            this.log('✗ No scholarship ID available (create first)', 'error');
            this.failedTests++;
            return false;
        }

        const updateData = {
            status: 'Inactive',
        };

        const result = await this.request<Scholarship>(`/api/scholarships/${this.testScholarshipId}`, {
            method: 'PUT',
            headers: this.getAuthHeaders(),
            body: JSON.stringify(updateData),
        });

        if (result.success && result.data) {
            this.log(`✓ Partial update successful, status: ${result.data.status}`, 'success');
            this.passedTests++;
            return true;
        } else {
            this.log(`✗ Failed partial update: ${result.error}`, 'error');
            this.failedTests++;
            return false;
        }
    }

    async testArchiveScholarship(): Promise<boolean> {
        this.log('Test: Archive Scholarship (PATCH)', 'test');

        if (!this.testScholarshipId) {
            this.log('✗ No scholarship ID available (create first)', 'error');
            this.failedTests++;
            return false;
        }

        const result = await this.request<Scholarship>(`/api/scholarships/${this.testScholarshipId}`, {
            method: 'PATCH',
            headers: this.getAuthHeaders(),
            body: JSON.stringify({ action: 'archive' }),
        });

        if (result.success && result.data) {
            this.log(`✓ Archived scholarship, isArchived: ${result.data.isArchived}`, 'success');
            this.passedTests++;
            return true;
        } else {
            this.log(`✗ Failed to archive scholarship: ${result.error}`, 'error');
            this.failedTests++;
            return false;
        }
    }

    async testGetScholarshipsList(): Promise<boolean> {
        this.log('Test: Get Scholarships List', 'test');

        const result = await this.request<Scholarship[]>('/api/scholarships?limit=10&page=1');

        if (result.success && Array.isArray(result.data)) {
            this.log(`✓ Retrieved ${result.data.length} scholarships`, 'success');
            this.passedTests++;
            return true;
        } else {
            this.log(`✗ Failed to get scholarships list: ${result.error}`, 'error');
            this.failedTests++;
            return false;
        }
    }

    async testUnauthorizedAccess(): Promise<boolean> {
        this.log('Test: Unauthorized Access (no auth)', 'test');

        const result = await this.request<Scholarship>('/api/scholarships/1', {
            method: 'PUT',
            body: JSON.stringify({ status: 'Active' }),
        });

        // Should return 403 Forbidden
        if (!result.success && (result as { status?: number }).status === 403) {
            this.log('✓ Unauthorized access correctly blocked', 'success');
            this.passedTests++;
            return true;
        } else {
            this.log('✗ Unauthorized access was not blocked', 'error');
            this.failedTests++;
            return false;
        }
    }

    printSummary() {
        console.log('\n' + '='.repeat(50));
        console.log('📊 Test Summary');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.passedTests}`);
        console.log(`❌ Failed: ${this.failedTests}`);
        console.log(`📝 Total:  ${this.passedTests + this.failedTests}`);
        console.log('='.repeat(50));

        if (this.failedTests === 0) {
            console.log('\n🎉 All tests passed!\n');
        } else {
            console.log(`\n⚠️  ${this.failedTests} test(s) failed\n`);
        }
    }

    async runAllTests() {
        const startTime = Date.now();

        // Login first
        await this.login();

        // Run tests in order
        await this.testGetScholarshipsList();
        await this.testCreateScholarship();
        await this.testGetScholarship();
        await this.testUpdateScholarship();
        await this.testPartialUpdate();
        await this.testArchiveScholarship();
        await this.testUnauthorizedAccess();

        // Print summary
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n⏱️  Test duration: ${duration}s\n`);
        this.printSummary();

        // Exit with error code if tests failed
        process.exit(this.failedTests > 0 ? 1 : 0);
    }
}

// Run tests
const tester = new ScholarshipApiTester();
tester.runAllTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
