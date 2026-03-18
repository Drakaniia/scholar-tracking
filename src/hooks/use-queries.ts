/**
 * TanStack Query Hooks for ScholarTrack
 * 
 * Usage:
 * 1. Wrap your app with TanStackProvider (already done in providers.tsx)
 * 2. Import and use hooks in your components
 * 
 * Example:
 * ```tsx
 * const { data: students, isLoading } = useStudents({ page: 1, limit: 10 });
 * const { mutate: deleteStudent } = useDeleteStudent();
 * ```
 */

import { useCallback } from 'react';
import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
} from '@tanstack/react-query';
import { toast } from 'sonner';
import type { StudentFilterOptions, CreateStudentInput, UpdateStudentInput } from '@/types';

// ============================================
// QUERY KEYS (Centralized for consistency)
// ============================================

export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: (source?: string) => [...queryKeys.dashboard.all, 'stats', source] as const,
    detailed: (source?: string) => [...queryKeys.dashboard.all, 'detailed', source] as const,
  },
  
  // Students
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (filters: StudentFilters) => [...queryKeys.students.lists(), filters] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.students.details(), id] as const,
    filterOptions: () => [...queryKeys.students.all, 'filter-options'] as const,
  },
  
  // Scholarships
  scholarships: {
    all: ['scholarships'] as const,
    lists: () => [...queryKeys.scholarships.all, 'list'] as const,
    list: (filters: ScholarshipFilters) => [...queryKeys.scholarships.lists(), filters] as const,
    details: () => [...queryKeys.scholarships.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.scholarships.details(), id] as const,
    filterOptions: () => [...queryKeys.scholarships.all, 'filter-options'] as const,
  },
  
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
  },
};

// ============================================
// TYPES
// ============================================

interface StudentFilters {
  search?: string;
  gradeLevel?: string;
  program?: string;
  status?: string;
  scholarshipId?: string;
  archived?: boolean;
  page?: number;
  limit?: number;
}

interface ScholarshipFilters {
  search?: string;
  type?: string;
  source?: string;
  status?: string;
  page?: number;
  limit?: number;
}

interface DashboardStats {
  stats: {
    totalStudents: number;
    studentsWithScholarships: number;
    totalScholarships: number;
    activeScholarships: number;
    totalAmountAwarded: number;
    totalDisbursed: number;
  };
  recentStudents: Array<{
    id: number;
    lastName: string;
    firstName: string;
    middleInitial: string | null;
    gradeLevel: string;
    yearLevel: string;
    scholarships: Array<{
      scholarshipStatus: string;
      scholarship: {
        scholarshipName: string;
        type: string;
      };
    }>;
    updatedAt: string;
  }>;
  charts: {
    studentsByGradeLevel: Array<{
      gradeLevel: string;
      _count: { id: number };
    }>;
    scholarshipsByType: Array<{
      type: string;
      _count: { id: number };
    }>;
    monthlyTrends: Array<{
      name: string;
      awarded: number;
      disbursed: number;
      balance: number;
    }>;
  };
}

interface Student {
  id: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  program: string;
  gradeLevel: string;
  yearLevel: string;
  status: string;
  scholarships: Array<{
    id: number;
    scholarshipId: number;
    awardDate: string;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    scholarshipStatus: string;
    scholarship: {
      scholarshipName: string;
      type: string;
      source: string;
    };
  }>;
}

interface StudentDetail extends Student {
  disbursements: Array<{
    id: number;
    amount: number;
    disbursementDate: string;
    term: string;
    method: string;
    scholarship: {
      scholarshipName: string;
      type: string;
      source: string;
    };
  }>;
  fees: Array<{
    tuitionFee: number;
    otherFee: number;
    miscellaneousFee: number;
    laboratoryFee: number;
    amountSubsidy: number;
    percentSubsidy: number;
    term: string;
    academicYear: string;
  }>;
}

interface Scholarship {
  id: number;
  scholarshipName: string;
  sponsor: string;
  type: string;
  source: string;
  amount: number;
  requirements: string | null;
  status: string;
}

interface ScholarshipCounts {
  total: number;
  internal: number;
  external: number;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  total?: number;
  totalPages?: number;
}

// ============================================
// DASHBOARD HOOKS
// ============================================

export function useDashboardStats(
  source?: string,
  options?: Partial<UseQueryOptions<ApiResponse<DashboardStats>, Error>>
) {
  return useQuery<ApiResponse<DashboardStats>, Error>({
    queryKey: queryKeys.dashboard.stats(source),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (source && source !== 'all') {
        params.append('source', source);
      }
      const url = `/api/dashboard${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useDashboardDetailed(
  source?: string,
  options?: Partial<UseQueryOptions<ApiResponse<StudentDetail[]>, Error>>
) {
  return useQuery<ApiResponse<StudentDetail[]>, Error>({
    queryKey: queryKeys.dashboard.detailed(source),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (source && source !== 'all') {
        params.append('source', source);
      }
      const url = `/api/dashboard/detailed${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch detailed dashboard data');
      }
      return response.json();
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

// ============================================
// STUDENT HOOKS
// ============================================

export function useStudents(
  filters: StudentFilters = {},
  options?: Partial<UseQueryOptions<ApiResponse<Student[]>, Error>>
) {
  return useQuery<ApiResponse<Student[]>, Error>({
    queryKey: queryKeys.students.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/students?${params}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch students');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

export function useStudent(id: number, options?: Partial<UseQueryOptions<ApiResponse<StudentDetail>, Error>>) {
  return useQuery<ApiResponse<StudentDetail>, Error>({
    queryKey: queryKeys.students.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/students/${id}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch student');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

export function useStudentFilterOptions(
  filters: StudentFilters = {},
  options?: Partial<UseQueryOptions<ApiResponse<StudentFilterOptions>, Error>>
) {
  return useQuery<ApiResponse<StudentFilterOptions>, Error>({
    queryKey: queryKeys.students.filterOptions(),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const url = `/api/students/filter-options${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch filter options');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ id: number }>, Error, CreateStudentInput>({
    mutationFn: async (data) => {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to create student');
      }
      return json;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Student created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create student');
    },
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<unknown>, Error, { id: number; data: UpdateStudentInput }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to update student');
      }
      return json;
    },
    onSuccess: (_, { id }) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Student updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update student');
    },
  });
}

export function useDeleteStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to delete student');
      }
      return json;
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Student deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete student');
    },
  });
}

export function useArchiveStudent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'archive' | 'unarchive' }) => {
      const response = await fetch(`/api/students/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || `Failed to ${action} student`);
      }
      return json;
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success(`Student ${variables.action}d successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive student');
    },
  });
}

// ============================================
// SCHOLARSHIP HOOKS
// ============================================

export function useScholarships(
  filters: ScholarshipFilters = {},
  options?: Partial<UseQueryOptions<ApiResponse<Scholarship[]>, Error>>
) {
  return useQuery<ApiResponse<Scholarship[]>, Error>({
    queryKey: queryKeys.scholarships.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/scholarships?${params}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch scholarships');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    ...options,
  });
}

export function useScholarship(id: number, options?: Partial<UseQueryOptions<ApiResponse<Scholarship>, Error>>) {
  return useQuery<ApiResponse<Scholarship>, Error>({
    queryKey: queryKeys.scholarships.detail(id),
    queryFn: async () => {
      const response = await fetch(`/api/scholarships/${id}`, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch scholarship');
      }
      return response.json();
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000, // 15 minutes
    ...options,
  });
}

export function useScholarshipFilterOptions(
  filters: ScholarshipFilters = {},
  options?: Partial<UseQueryOptions<ApiResponse<ScholarshipCounts>, Error>>
) {
  return useQuery<ApiResponse<ScholarshipCounts>, Error>({
    queryKey: queryKeys.scholarships.filterOptions(),
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, String(value));
        }
      });

      const url = `/api/scholarships/filter-options${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch scholarship filter options');
      }
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

export function useCreateScholarship() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ id: number }>, Error, Partial<Scholarship>>({
    mutationFn: async (data) => {
      const response = await fetch('/api/scholarships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to create scholarship');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Scholarship created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create scholarship');
    },
  });
}

export function useUpdateScholarship() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<unknown>, Error, { id: number; data: Partial<Scholarship> }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/scholarships/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to update scholarship');
      }
      return json;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Scholarship updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update scholarship');
    },
  });
}

export function useDeleteScholarship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/scholarships/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to delete scholarship');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      toast.success('Scholarship deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete scholarship');
    },
  });
}

/**
 * Hook to prefetch key data after successful login
 * This hydrates the cache so subsequent page loads are instant
 */
export function usePrefetchData() {
  const queryClient = useQueryClient();

  const prefetchAll = useCallback(async () => {
    // Prefetch dashboard stats
    await queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.stats(),
      queryFn: async () => {
        const response = await fetch('/api/dashboard', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to prefetch dashboard stats');
        return response.json();
      },
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch dashboard detailed data
    await queryClient.prefetchQuery({
      queryKey: queryKeys.dashboard.detailed(),
      queryFn: async () => {
        const response = await fetch('/api/dashboard/detailed', { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to prefetch dashboard details');
        return response.json();
      },
      staleTime: 5 * 60 * 1000,
    });

    // Prefetch students data (first page)
    await queryClient.prefetchQuery({
      queryKey: queryKeys.students.list({ page: 1, limit: 11 }),
      queryFn: async () => {
        const params = new URLSearchParams({ limit: '11', page: '1', archived: 'false' });
        const response = await fetch(`/api/students?${params}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to prefetch students');
        return response.json();
      },
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch scholarships data (first page)
    await queryClient.prefetchQuery({
      queryKey: queryKeys.scholarships.list({ page: 1, limit: 10 }),
      queryFn: async () => {
        const params = new URLSearchParams({ limit: '10', page: '1' });
        const response = await fetch(`/api/scholarships?${params}`, { credentials: 'include' });
        if (!response.ok) throw new Error('Failed to prefetch scholarships');
        return response.json();
      },
      staleTime: 2 * 60 * 1000,
    });
  }, [queryClient]);

  return { prefetchAll };
}
