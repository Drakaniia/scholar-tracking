import type { QueryClient, QueryKey } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/use-queries';
import {
  getDefaultScholarshipFlowStartYear,
  getScholarshipFlowEndYear,
} from '@/lib/scholarship-flow-years';
import { fetchWithCache } from '@/lib/cache';
import type { UserRole } from '@/types';

export const PRELOAD_CACHE_VERSION = 1;
export const PRELOAD_CACHE_BUSTER = `v${PRELOAD_CACHE_VERSION}`;

export const DEFAULT_PRELOAD_ROUTES = [
  '/',
  '/students',
  '/registry',
  '/scholarships',
  '/scholarship-flow',
  '/reports',
] as const;

export const ADMIN_PRELOAD_ROUTES = ['/settings'] as const;

type PreloadRole = UserRole | string | null | undefined;

type FetchValue = string | number | boolean | null | undefined;

export interface PreloadQuery {
  label: string;
  queryKey: QueryKey;
  queryFn: () => Promise<unknown>;
  staleTime: number;
  gcTime: number;
}

export interface PreloadEndpoint {
  label: string;
  url: string;
  ttl: number;
}

interface PreloadBuildOptions {
  role?: PreloadRole;
  now?: Date;
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000;
const DEFAULT_GC_TIME = 8 * 60 * 60 * 1000;
const FILTER_STALE_TIME = 15 * 60 * 1000;
const ENDPOINT_TTL = 5 * 60 * 1000;
const ADMIN_ENDPOINT_TTL = 60 * 1000;

const DEFAULT_STUDENT_LIST_FILTERS = {
  search: '',
  gradeLevel: undefined,
  program: undefined,
  status: undefined,
  scholarshipSource: undefined,
  scholarshipId: undefined,
  archived: false,
  population: 'all',
  page: 1,
  limit: 11,
};

const DEFAULT_STUDENT_FILTER_OPTIONS = {
  search: '',
  gradeLevel: 'all',
  program: 'all',
  status: 'all',
  scholarshipSource: 'all',
  scholarshipId: 'all',
  archived: false,
  population: 'all',
};

const DEFAULT_SCHOLARSHIP_LIST_FILTERS = {
  search: '',
  source: undefined,
  page: 1,
  limit: 10,
};

const DEFAULT_SCHOLARSHIP_FILTER_OPTIONS = {
  source: 'all',
};

function isAdminRole(role: PreloadRole) {
  return role === 'ADMIN';
}

function buildApiUrl(path: string, params?: Record<string, FetchValue>) {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

async function fetchJson(url: string) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Failed to preload ${url}`);
  }
  return response.json();
}

function createQuery(
  label: string,
  queryKey: QueryKey,
  url: string,
  staleTime = DEFAULT_STALE_TIME,
  gcTime = DEFAULT_GC_TIME
): PreloadQuery {
  return {
    label,
    queryKey,
    staleTime,
    gcTime,
    queryFn: () => fetchJson(url),
  };
}

export function getPreloadRoutes(role?: PreloadRole) {
  return isAdminRole(role)
    ? [...DEFAULT_PRELOAD_ROUTES, ...ADMIN_PRELOAD_ROUTES]
    : [...DEFAULT_PRELOAD_ROUTES];
}

export function getQueryCacheStorageKey(userId: number | string | null | undefined) {
  return `scholartrack:query-cache:${PRELOAD_CACHE_BUSTER}:user:${userId ?? 'anonymous'}`;
}

export function getSessionPreloadMarkerKey(userId: number | string | null | undefined) {
  return `scholartrack:preload-complete:${PRELOAD_CACHE_BUSTER}:user:${userId ?? 'anonymous'}`;
}

export function hasCompletedSessionPreload(
  userId: number | string | null | undefined,
  storage: Pick<Storage, 'getItem'> = sessionStorage
) {
  try {
    return storage.getItem(getSessionPreloadMarkerKey(userId)) === 'true';
  } catch {
    return false;
  }
}

export function markSessionPreloadComplete(
  userId: number | string | null | undefined,
  storage: Pick<Storage, 'setItem'> = sessionStorage
) {
  try {
    storage.setItem(getSessionPreloadMarkerKey(userId), 'true');
  } catch {
    // Storage can be unavailable in private browsing or locked-down environments.
  }
}

export function clearSessionPreloadMarkers(
  storage: Pick<Storage, 'key' | 'length' | 'removeItem'> | null =
    typeof window === 'undefined' ? null : sessionStorage
) {
  if (!storage) {
    return;
  }

  const keysToRemove: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith('scholartrack:preload-complete:')) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key));
}

export function buildPreloadQueries(options: PreloadBuildOptions = {}): PreloadQuery[] {
  const startYear = getDefaultScholarshipFlowStartYear(options.now);
  const flowEndYear = getScholarshipFlowEndYear(startYear);

  const queries: PreloadQuery[] = [
    createQuery(
      'dashboard:stats:all',
      queryKeys.dashboard.stats('all', ''),
      '/api/dashboard',
      DEFAULT_STALE_TIME
    ),
    createQuery(
      'students:list:default',
      queryKeys.students.list(DEFAULT_STUDENT_LIST_FILTERS),
      buildApiUrl('/api/students', DEFAULT_STUDENT_LIST_FILTERS),
      2 * 60 * 1000
    ),
    createQuery(
      'students:filters:default',
      queryKeys.students.filterOptions(DEFAULT_STUDENT_FILTER_OPTIONS),
      buildApiUrl('/api/students/filter-options', DEFAULT_STUDENT_FILTER_OPTIONS),
      FILTER_STALE_TIME
    ),
    createQuery(
      'scholarships:list:default',
      queryKeys.scholarships.list(DEFAULT_SCHOLARSHIP_LIST_FILTERS),
      buildApiUrl('/api/scholarships', DEFAULT_SCHOLARSHIP_LIST_FILTERS),
      2 * 60 * 1000
    ),
    createQuery(
      'scholarships:filters:default',
      queryKeys.scholarships.filterOptions(DEFAULT_SCHOLARSHIP_FILTER_OPTIONS),
      buildApiUrl('/api/scholarships/filter-options', DEFAULT_SCHOLARSHIP_FILTER_OPTIONS),
      FILTER_STALE_TIME
    ),
    createQuery(
      'academic-years:active',
      queryKeys.academicYears.active(),
      '/api/academic-years?action=active',
      DEFAULT_STALE_TIME
    ),
    createQuery(
      'academic-years:list',
      queryKeys.academicYears.lists(),
      '/api/academic-years?limit=100',
      DEFAULT_STALE_TIME
    ),
    createQuery(
      'dashboard:detailed:all',
      queryKeys.dashboard.detailed('all'),
      '/api/dashboard/detailed',
      DEFAULT_STALE_TIME
    ),
    createQuery(
      'reports:detailed:default',
      queryKeys.dashboard.detailed(),
      '/api/dashboard/detailed',
      DEFAULT_STALE_TIME
    ),
    createQuery(
      'scholarship-flow:all',
      queryKeys.scholarships.flow('all', startYear, ''),
      `/api/scholarships/flow?endYear=${flowEndYear}`,
      2 * 60 * 1000
    ),
  ];

  return queries;
}

export function buildPreloadEndpoints(options: PreloadBuildOptions = {}): PreloadEndpoint[] {
  const endpoints: PreloadEndpoint[] = [
    {
      label: 'registry:list:default',
      url: '/api/registry?page=1&limit=12&lane=all&status=all',
      ttl: ENDPOINT_TTL,
    },
    {
      label: 'registry:promotion-preview',
      url: '/api/academic-years/auto-promote',
      ttl: ENDPOINT_TTL,
    },
  ];

  if (isAdminRole(options.role)) {
    endpoints.push(
      {
        label: 'settings:users:default',
        url: '/api/users?page=1&limit=25',
        ttl: ADMIN_ENDPOINT_TTL,
      },
      {
        label: 'settings:profile',
        url: '/api/profile',
        ttl: ADMIN_ENDPOINT_TTL,
      },
      {
        label: 'settings:academic-years:default',
        url: '/api/academic-years?page=1&limit=10',
        ttl: ENDPOINT_TTL,
      },
      {
        label: 'settings:audit-filter-options',
        url: '/api/audit-logs/filter-options',
        ttl: ENDPOINT_TTL,
      }
    );
  }

  return endpoints;
}

export async function prefetchApplicationQueries(
  queryClient: QueryClient,
  queries: PreloadQuery[]
) {
  return Promise.allSettled(
    queries.map((query) =>
      queryClient.prefetchQuery({
        queryKey: query.queryKey,
        queryFn: query.queryFn,
        staleTime: query.staleTime,
        gcTime: query.gcTime,
      })
    )
  );
}

export async function prefetchApplicationEndpoints(endpoints: PreloadEndpoint[]) {
  return Promise.allSettled(
    endpoints.map((endpoint) =>
      fetchWithCache(endpoint.url, undefined, endpoint.ttl).catch((error) => {
        console.warn(`Failed to preload ${endpoint.label}:`, error);
      })
    )
  );
}
