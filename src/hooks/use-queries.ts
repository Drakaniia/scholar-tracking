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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient, UseQueryOptions } from '@tanstack/react-query';
import { toast } from 'sonner';

import { clientCache } from '@/lib/cache';
import { getScholarshipFlowEndYear } from '@/lib/scholarship-flow-years';
import type {
  AcademicYear,
  AcademicYearInput,
  CreateStudentInput,
  CreateStudentsInput,
  StudentFilterOptions,
  UpdateStudentInput,
} from '@/types';

// ============================================
// QUERY KEYS (Centralized for consistency)
// ============================================

export const queryKeys = {
  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: (source?: string, gradeLevel?: string) =>
      [...queryKeys.dashboard.all, 'stats', source, gradeLevel] as const,
    detailed: (source?: string) => [...queryKeys.dashboard.all, 'detailed', source] as const,
  },

  // Students
  students: {
    all: ['students'] as const,
    lists: () => [...queryKeys.students.all, 'list'] as const,
    list: (filters: StudentFilters) => [...queryKeys.students.lists(), filters] as const,
    details: () => [...queryKeys.students.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.students.details(), id] as const,
    filterOptions: (filters: StudentFilters = {}) =>
      [...queryKeys.students.all, 'filter-options', filters] as const,
  },

  // Scholarships
  scholarships: {
    all: ['scholarships'] as const,
    lists: () => [...queryKeys.scholarships.all, 'list'] as const,
    list: (filters: ScholarshipFilters) => [...queryKeys.scholarships.lists(), filters] as const,
    details: () => [...queryKeys.scholarships.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.scholarships.details(), id] as const,
    filterOptions: (filters: ScholarshipFilters = {}) =>
      [...queryKeys.scholarships.all, 'filter-options', filters] as const,
    flow: (source?: string, startYear?: number, gradeLevel?: string) =>
      [...queryKeys.scholarships.all, 'flow', source || 'all', startYear || 'current', gradeLevel || 'all'] as const,
  },

  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
  },

  // Academic Years
  academicYears: {
    all: ['academicYears'] as const,
    lists: () => [...queryKeys.academicYears.all, 'list'] as const,
    active: () => [...queryKeys.academicYears.all, 'active'] as const,
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
  scholarshipSource?: string;
  academicYearId?: string | number;
  archived?: boolean;
  population?: string;
  page?: number;
  limit?: number;
}

interface ScholarshipFilters {
  search?: string;
  type?: string;
  source?: string;
  status?: string;
  eligibleGradeLevels?: string;
  academicYearId?: string | number;
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
    academicYearId: number | null;
    awardDate: string;
    grantAmount: number;
    scholarshipStatus: string;
    academicYearRel?: {
      id: number;
      year: string;
      startDate: string;
      endDate: string;
      semester: string;
      isActive: boolean;
    } | null;
    scholarship: {
      scholarshipName: string;
      type: string;
      source: string;
      amountSubsidy: number;
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
    academicYearId: number | null;
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
  coveredTerms: string;
}

interface ScholarshipCounts {
  total: number;
  internal: number;
  external: number;
}

export interface ScholarshipFlowData {
  years: Array<{
    year: number;
    label: string;
    awardCount: number;
    beneficiaryCount: number;
    awardedAmount: number;
    disbursementCount: number;
    disbursedAmount: number;
    balance: number;
    subsidyAmount: number;
    internalAwards: number;
    externalAwards: number;
    internalAmount: number;
    externalAmount: number;
  }>;
  summary: {
    startYear: number;
    endYear: number;
    totalAwarded: number;
    totalDisbursed: number;
    totalBalance: number;
    totalAwards: number;
    totalBeneficiaries: number;
    activeStudents: number;
    singleScholarshipStudents: number;
    multiScholarshipStudents: number;
    noScholarshipStudents: number;
    maxScholarshipsPerStudent: number;
  };
  loadDistribution: Array<{
    key: string;
    label: string;
    students: number;
    percentage: number;
  }>;
  multiScholarshipStudents: Array<{
    id: number;
    studentName: string;
    gradeLevel: string;
    yearLevel: string;
    program: string;
    scholarshipCount: number;
    totalAmount: number;
    scholarships: Array<{
      scholarshipName: string;
      type: string;
      source: string;
      amount: number;
      status: string;
      academicYear: string | null;
    }>;
  }>;
  topTypes: Array<{
    type: string;
    awardCount: number;
    awardedAmount: number;
    beneficiaryCount: number;
  }>;
  topScholarships: Array<{
    scholarshipName: string;
    type: string;
    source: string;
    academicYear: string | null;
    awardCount: number;
    awardedAmount: number;
    beneficiaryCount: number;
  }>;
  source: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  details?: string[];
  limit?: number;
  page?: number;
  total?: number;
  totalPages?: number;
  cached?: boolean;
}

function getApiErrorMessage(response: { error?: string; details?: string[] }, fallback: string) {
  if (response.details && response.details.length > 0) {
    return response.details.join('\n');
  }

  return response.error || fallback;
}

async function fetchJsonResponse<T>(response: Response, fallbackError: string): Promise<T> {
  let json: T & { error?: string; details?: string[] };

  try {
    json = await response.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(
        response.ok ? 'Server returned an unreadable response' : 'Server rejected the request'
      );
    }

    throw error;
  }

  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, fallbackError));
  }

  return json;
}

function removeListItemsById<T extends { id: number }>(
  previous: ApiResponse<T[]> | undefined,
  removedIds: readonly number[]
): ApiResponse<T[]> | undefined {
  if (!previous) {
    return previous;
  }

  const removedIdSet = new Set(removedIds);
  const nextData = previous.data.filter((item) => !removedIdSet.has(item.id));
  const removedCount = previous.data.length - nextData.length;

  if (removedCount === 0) {
    return previous;
  }

  const nextTotal =
    typeof previous.total === 'number' ? Math.max(previous.total - removedCount, 0) : undefined;
  const nextTotalPages =
    typeof nextTotal === 'number' && typeof previous.limit === 'number'
      ? Math.ceil(nextTotal / previous.limit)
      : previous.totalPages;

  return {
    ...previous,
    data: nextData,
    total: nextTotal,
    totalPages: nextTotalPages,
  };
}

function removeStudentsFromListQueries(queryClient: QueryClient, studentIds: readonly number[]) {
  queryClient.setQueriesData<ApiResponse<Student[]>>(
    { queryKey: queryKeys.students.lists() },
    (previous) => removeListItemsById(previous, studentIds)
  );
}

function removeScholarshipsFromListQueries(
  queryClient: QueryClient,
  scholarshipIds: readonly number[]
) {
  queryClient.setQueriesData<ApiResponse<Scholarship[]>>(
    { queryKey: queryKeys.scholarships.lists() },
    (previous) => removeListItemsById(previous, scholarshipIds)
  );
}

// ============================================
// DASHBOARD HOOKS
// ============================================

export function useDashboardStats(
  source?: string,
  gradeLevel?: string,
  options?: Partial<UseQueryOptions<ApiResponse<DashboardStats>, Error>>
) {
  return useQuery<ApiResponse<DashboardStats>, Error>({
    queryKey: queryKeys.dashboard.stats(source, gradeLevel),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (source && source !== 'all') {
        params.append('source', source);
      }
      if (gradeLevel && gradeLevel !== 'all') {
        params.append('gradeLevel', gradeLevel);
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

export function useStudent(
  id: number,
  options?: Partial<UseQueryOptions<ApiResponse<StudentDetail>, Error>>
) {
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
    queryKey: queryKeys.students.filterOptions(filters),
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
    staleTime: 0, // Always fetch fresh data for instant filter updates
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
    ...options,
  });
}

export function useCreateStudent() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<{ id: number }>, Error, CreateStudentInput>({
    mutationFn: async (data) => {
      let response: Response;

      try {
        response = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        });
      } catch (error) {
        if (error instanceof TypeError) {
          throw new Error('Unable to reach the server. Check the app connection and try again.');
        }

        throw error;
      }

      return fetchJsonResponse<ApiResponse<{ id: number }>>(response, 'Failed to create student');
    },
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      clientCache.invalidate('/api/academic-years/auto-promote');
      toast.success('Student created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create student');
    },
  });
}

export function useCreateStudents() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<Array<{ id: number }>>, Error, CreateStudentsInput>({
    mutationFn: async (data) => {
      let response: Response;

      try {
        response = await fetch('/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
          credentials: 'include',
        });
      } catch (error) {
        if (error instanceof TypeError) {
          throw new Error('Unable to reach the server. Check the app connection and try again.');
        }

        throw error;
      }

      return fetchJsonResponse<ApiResponse<Array<{ id: number }>>>(
        response,
        'Failed to create students'
      );
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      clientCache.invalidate('/api/academic-years/auto-promote');
      toast.success(`${response.data.length} students created successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create students');
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
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      clientCache.invalidate('/api/academic-years/auto-promote');
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
        throw new Error(json.error || 'Failed to archive student');
      }
      return json;
    },
    onSuccess: (_, id) => {
      // Invalidate relevant queries
      removeStudentsFromListQueries(queryClient, [id]);
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      clientCache.invalidate('/api/academic-years/auto-promote');
      toast.success('Student archived successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive student');
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
      removeStudentsFromListQueries(queryClient, [variables.id]);
      queryClient.invalidateQueries({ queryKey: queryKeys.students.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      clientCache.invalidate('/api/academic-years/auto-promote');
      toast.success(`Student ${variables.action}d successfully`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive student');
    },
  });
}

export function useBulkArchiveStudents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      payload:
        | number[]
        | {
            selectAll: true;
            action?: 'archive' | 'unarchive';
            filters: Record<string, string | boolean | undefined>;
          }
        | { studentIds: number[]; action?: 'archive' | 'unarchive' }
    ) => {
      let body: string;
      if (Array.isArray(payload)) {
        body = JSON.stringify({ studentIds: payload });
      } else {
        body = JSON.stringify(payload);
      }

      const response = await fetch('/api/students/bulk-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to bulk archive students');
      }
      return json;
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
      clientCache.invalidate('/api/academic-years/auto-promote');
      const data = response.data;
      const action = data?.action ?? 'archive';
      const actionLabel = action === 'unarchive' ? 'unarchived' : 'archived';
      const count = data?.processedCount ?? 0;
      const errors = data?.errorCount ?? 0;
      if (errors > 0) {
        toast.warning(`${count} student(s) ${actionLabel}, ${errors} issue(s)`);
      } else {
        toast.success(`${count} student(s) ${actionLabel} successfully`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to bulk archive students');
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

export function useScholarship(
  id: number,
  academicYearId?: number | null,
  options?: Partial<UseQueryOptions<ApiResponse<Scholarship>, Error>>
) {
  return useQuery<ApiResponse<Scholarship>, Error>({
    queryKey: [...queryKeys.scholarships.detail(id), academicYearId || 'all'],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (academicYearId) {
        params.append('academicYearId', String(academicYearId));
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await fetch(`/api/scholarships/${id}${query}`, { credentials: 'include' });
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
    queryKey: queryKeys.scholarships.filterOptions(filters),
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
    staleTime: 0, // Always fetch fresh data for instant filter updates
    gcTime: 30 * 60 * 1000, // 30 minutes garbage collection
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
      // Force immediate refetch so the list updates right away
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.filterOptions(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all, refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all, refetchType: 'all' });
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
      // Force immediate refetch so the list updates right away
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.filterOptions(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.detail(id), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all, refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all, refetchType: 'all' });
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
        throw new Error(json.error || 'Failed to archive scholarship');
      }
      return json;
    },
    onSuccess: (_, id) => {
      removeScholarshipsFromListQueries(queryClient, [id]);
      // Force immediate refetch so the list updates right away
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.lists(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.filterOptions(), refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all, refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all, refetchType: 'all' });
      toast.success('Scholarship archived successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive scholarship');
    },
  });
}

export function useScholarshipFlow(
  source = 'all',
  startYear?: number,
  gradeLevel = 'all',
  options?: Partial<UseQueryOptions<ApiResponse<ScholarshipFlowData>, Error>>
) {
  return useQuery<ApiResponse<ScholarshipFlowData>, Error>({
    queryKey: queryKeys.scholarships.flow(source, startYear, gradeLevel),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (source && source !== 'all') {
        params.set('source', source);
      }
      if (startYear) {
        params.set('endYear', String(getScholarshipFlowEndYear(startYear)));
      }

      if (gradeLevel && gradeLevel !== 'all') {
        params.set('gradeLevel', gradeLevel);
      }

      const url = `/api/scholarships/flow${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch scholarship flow');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...options,
  });
}

/**
 * Hook to prefetch key data after successful login
 * This hydrates the cache so subsequent page loads are instant
 */
export function usePrefetchData() {
  const queryClient = useQueryClient();

  const prefetchAll = useCallback(async () => {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.stats(),
        queryFn: async () => {
          const response = await fetch('/api/dashboard', { credentials: 'include' });
          if (!response.ok) throw new Error('Failed to prefetch dashboard stats');
          return response.json();
        },
        staleTime: 5 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.students.list({ page: 1, limit: 11 }),
        queryFn: async () => {
          const params = new URLSearchParams({ limit: '11', page: '1', archived: 'false' });
          const response = await fetch(`/api/students?${params}`, { credentials: 'include' });
          if (!response.ok) throw new Error('Failed to prefetch students');
          return response.json();
        },
        staleTime: 2 * 60 * 1000,
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.scholarships.list({ page: 1, limit: 10 }),
        queryFn: async () => {
          const params = new URLSearchParams({ limit: '10', page: '1' });
          const response = await fetch(`/api/scholarships?${params}`, { credentials: 'include' });
          if (!response.ok) throw new Error('Failed to prefetch scholarships');
          return response.json();
        },
        staleTime: 2 * 60 * 1000,
      }),
    ]);
  }, [queryClient]);

  return { prefetchAll };
}

// ============================================
// ACADEMIC YEARS
// ============================================

// Get all academic years
export function useAcademicYears() {
  return useQuery<ApiResponse<AcademicYear[]>, Error>({
    queryKey: queryKeys.academicYears.lists(),
    queryFn: async () => {
      const response = await fetch('/api/academic-years?limit=100', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch academic years');
      }
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data (academic years change via Settings)
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get active academic year
export function useActiveAcademicYear() {
  return useQuery<ApiResponse<AcademicYear | null>, Error>({
    queryKey: queryKeys.academicYears.active(),
    queryFn: async () => {
      const response = await fetch('/api/academic-years?action=active', { credentials: 'include' });
      if (!response.ok) {
        throw new Error('Failed to fetch active academic year');
      }
      return response.json();
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<AcademicYear>, Error, AcademicYearInput>({
    mutationFn: async (data) => {
      const response = await fetch('/api/academic-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        const errorMessage = json.error || `Failed to create academic year (${response.status})`;
        throw new Error(errorMessage);
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all });
      toast.success('Academic year created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create academic year');
    },
  });
}

export function useUpdateAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<AcademicYear>, Error, { id: number; data: AcademicYearInput }>({
    mutationFn: async ({ id, data }) => {
      const response = await fetch(`/api/academic-years?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to update academic year');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all });
      toast.success('Academic year updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update academic year');
    },
  });
}

export function useDeleteAcademicYear() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<unknown>, Error, number>({
    mutationFn: async (id) => {
      const response = await fetch(`/api/academic-years?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Failed to delete academic year');
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.academicYears.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.scholarships.all });
      toast.success('Academic year deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete academic year');
    },
  });
}
