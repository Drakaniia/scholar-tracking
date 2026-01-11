/**
 * API Response Types
 * Shared type definitions for API responses
 */

// Base API Response
export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

// Paginated Response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

// List Response (non-paginated)
export interface ListResponse<T> extends ApiResponse<T[]> {
    count: number
}

// Error Response
export interface ErrorResponse {
    success: false
    error: string
    message?: string
    code?: string
}

// Success Response
export interface SuccessResponse<T = undefined> {
    success: true
    data: T
    message?: string
}

// Dashboard Stats Response
export interface DashboardStats {
    totalStudents: number
    totalScholarships: number
    totalApplications: number
    pendingApplications: number
    approvedApplications: number
    rejectedApplications: number
    totalDisbursed: number
}

// Auth Response
export interface AuthResponse {
    success: boolean
    user?: {
        id: number
        email: string
        firstName: string
        lastName: string
        role: string
    }
    token?: string
    error?: string
}

// Export Response
export interface ExportResponse {
    success: boolean
    filename?: string
    data?: Blob
    error?: string
}
