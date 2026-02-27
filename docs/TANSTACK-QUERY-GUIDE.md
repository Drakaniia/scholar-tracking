/**
 * TanStack Query Implementation Guide for ScholarTrack
 * 
 * This guide shows you how to use TanStack Query for data fetching and caching.
 */

// ============================================
// 1. INSTALLATION (Already done)
// ============================================

/*
npm install @tanstack/react-query @tanstack/react-query-devtools
*/

// ============================================
// 2. BASIC USAGE EXAMPLES
// ============================================

// ────────────────────────────────────────────
// Example 1: Fetching Data with useQuery
// ────────────────────────────────────────────

import { useDashboardStats } from '@/hooks/use-queries';

function DashboardExample() {
  // Basic usage
  const { data, isLoading, error } = useDashboardStats();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h1>Total Students: {data.data.stats.totalStudents}</h1>
    </div>
  );
}

// ────────────────────────────────────────────
// Example 2: Query with Parameters
// ────────────────────────────────────────────

import { useStudents } from '@/hooks/use-queries';

function StudentsListExample() {
  const { data, isLoading } = useStudents({
    page: 1,
    limit: 10,
    search: 'John',
    gradeLevel: 'SENIOR_HIGH',
  });
  
  return (
    <div>
      {data?.data.map(student => (
        <div key={student.id}>{student.firstName}</div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────
// Example 3: Creating Data with useMutation
// ────────────────────────────────────────────

import { useCreateStudent } from '@/hooks/use-queries';

function CreateStudentForm() {
  const createStudent = useCreateStudent();
  
  const handleSubmit = (data) => {
    createStudent.mutate(data, {
      onSuccess: () => {
        // Query automatically invalidated and refetched
        console.log('Student created!');
      },
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="firstName" placeholder="First Name" />
      <button type="submit" disabled={createStudent.isPending}>
        {createStudent.isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────
// Example 4: Updating Data with useMutation
// ────────────────────────────────────────────

import { useUpdateStudent } from '@/hooks/use-queries';

function EditStudentForm({ studentId }) {
  const updateStudent = useUpdateStudent();
  
  const handleSubmit = (data) => {
    updateStudent.mutate({ id: studentId, data });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
      <button type="submit" disabled={updateStudent.isPending}>
        {updateStudent.isPending ? 'Updating...' : 'Update'}
      </button>
    </form>
  );
}

// ────────────────────────────────────────────
// Example 5: Deleting Data with useMutation
// ────────────────────────────────────────────

import { useDeleteStudent } from '@/hooks/use-queries';

function DeleteButton({ studentId }) {
  const deleteStudent = useDeleteStudent();
  
  const handleDelete = () => {
    if (confirm('Are you sure?')) {
      deleteStudent.mutate(studentId);
    }
  };
  
  return (
    <button onClick={handleDelete} disabled={deleteStudent.isPending}>
      {deleteStudent.isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}

// ────────────────────────────────────────────
// Example 6: Manual Query with useQuery (for details)
// ────────────────────────────────────────────

import { useStudent } from '@/hooks/use-queries';

function StudentDetail({ studentId }) {
  const { data, isLoading } = useStudent(studentId);
  
  if (isLoading) return <div>Loading student...</div>;
  
  return (
    <div>
      <h1>{data.data.firstName} {data.data.lastName}</h1>
      {/* render details */}
    </div>
  );
}

// ────────────────────────────────────────────
// Example 7: Query Options (staleTime, enabled, etc.)
// ────────────────────────────────────────────

import { useDashboardStats } from '@/hooks/use-queries';

function DashboardWithOptions() {
  const { data } = useDashboardStats({
    staleTime: 5 * 60 * 1000, // Data is fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Cache persists for 30 minutes
    retry: 2,                 // Retry failed requests 2 times
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: true,            // Set to false to disable query
  });
  
  return <div>{/* render data */}</div>;
}

// ────────────────────────────────────────────
// Example 8: Using Query Client Manually
// ────────────────────────────────────────────

import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/use-queries';

function ManualInvalidation() {
  const queryClient = useQueryClient();
  
  const handleRefresh = () => {
    // Invalidate specific query
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.dashboard.stats() 
    });
    
    // Invalidate all student queries
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.students.all 
    });
    
    // Invalidate ALL queries
    queryClient.invalidateQueries();
  };
  
  return <button onClick={handleRefresh}>Refresh Data</button>;
}

// ────────────────────────────────────────────
// Example 9: Optimistic Updates
// ────────────────────────────────────────────

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/hooks/use-queries';

function OptimisticUpdate() {
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: (newStudent) => fetch('/api/students', {
      method: 'POST',
      body: JSON.stringify(newStudent),
    }),
    
    // Optimistically update the cache
    onMutate: async (newStudent) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.students.lists() 
      });
      
      const previousStudents = queryClient.getQueryData(
        queryKeys.students.lists()
      );
      
      queryClient.setQueryData(
        queryKeys.students.lists(),
        (old) => ({
          ...old,
          data: [...old.data, newStudent],
        })
      );
      
      return { previousStudents };
    },
    
    // If mutation fails, rollback
    onError: (err, newStudent, context) => {
      queryClient.setQueryData(
        queryKeys.students.lists(),
        context.previousStudents
      );
    },
    
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.students.lists() 
      });
    },
  });
  
  return <div>{/* use mutation.mutate() */}</div>;
}

// ────────────────────────────────────────────
// Example 10: Dependent Queries (fetch only when ready)
// ────────────────────────────────────────────

import { useStudent, useStudents } from '@/hooks/use-queries';

function DependentQueries({ studentId }) {
  // First query
  const { data: studentsData } = useStudents({ limit: 10 });
  
  // Second query only runs when first query succeeds
  const { data: studentData } = useStudent(studentId, {
    enabled: !!studentsData, // Only fetch if studentsData exists
  });
  
  return <div>{/* render data */}</div>;
}

// ============================================
// 3. QUERY KEYS REFERENCE
// ============================================

/*
import { queryKeys } from '@/hooks/use-queries';

// Dashboard
queryKeys.dashboard.all           // ['dashboard']
queryKeys.dashboard.stats()       // ['dashboard', 'stats']
queryKeys.dashboard.detailed()    // ['dashboard', 'detailed']

// Students
queryKeys.students.all                         // ['students']
queryKeys.students.lists()                     // ['students', 'list']
queryKeys.students.list({ page: 1 })           // ['students', 'list', { page: 1 }]
queryKeys.students.detail(123)                 // ['students', 'detail', 123]
queryKeys.students.filterOptions()             // ['students', 'filter-options']

// Scholarships
queryKeys.scholarships.all                     // ['scholarships']
queryKeys.scholarships.lists()                 // ['scholarships', 'list']
queryKeys.scholarships.list({ type: 'CHED' })  // ['scholarships', 'list', { type: 'CHED' }]
queryKeys.scholarships.detail(456)             // ['scholarships', 'detail', 456]

// Users
queryKeys.users.all           // ['users']
queryKeys.users.lists()       // ['users', 'list']
*/

// ============================================
// 4. MIGRATION CHECKLIST
// ============================================

/*
From → To Migration:

❌ OLD: Manual fetch with useEffect
✅ NEW: useQuery hook

// OLD
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetch('/api/dashboard')
    .then(res => res.json())
    .then(data => {
      setData(data);
      setLoading(false);
    });
}, []);

// NEW
const { data, isLoading } = useDashboardStats();


❌ OLD: Manual mutation with fetch
✅ NEW: useMutation hook

// OLD
const handleSubmit = async (data) => {
  const res = await fetch('/api/students', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  // handle response...
};

// NEW
const createStudent = useCreateStudent();
const handleSubmit = (data) => {
  createStudent.mutate(data);
};


❌ OLD: Manual cache invalidation
✅ NEW: Automatic with mutations

// OLD (manual)
clientCache.invalidatePattern('/api/students');

// NEW (automatic - built into mutation hooks)
// Just use the mutation hook, invalidation happens automatically!
*/

// ============================================
// 5. BENEFITS OF TANSTACK QUERY
// ============================================

/*
✅ Automatic caching with smart defaults
✅ Background refetching (stale-while-revalidate)
✅ Automatic retries on failure
✅ Request deduplication (no duplicate requests)
✅ Pagination support built-in
✅ Optimistic updates
✅ DevTools for debugging
✅ TypeScript support
✅ Reacts to network reconnection
✅ Focus revalidation (optional)
*/

// ============================================
// 6. DEVTOOLS USAGE
// ============================================

/*
The React Query DevTools are already included in development.
Look for the 🐌 icon in the bottom-right corner of your app.

Features:
- View all active queries
- See query state (loading, success, error)
- Inspect query data
- Manually invalidate queries
- View query timing

To disable in production, the devtools are automatically tree-shaken.
*/

// ============================================
// 7. COMMON PATTERNS
// ============================================

// Pattern 1: Search with Debounce
/*
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

const { data } = useStudents({
  search: debouncedSearch,
});
*/

// Pattern 2: Infinite Scroll / Load More
/*
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['students'],
  queryFn: ({ pageParam = 1 }) => fetchStudents({ page: pageParam }),
  getNextPageParam: (lastPage) => lastPage.nextPage,
});
*/

// Pattern 3: Prefetching on Hover
/*
const queryClient = useQueryClient();

<Link 
  href="/students/123"
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.students.detail(123),
      queryFn: () => fetch(`/api/students/123`).then(res => res.json()),
    });
  }}
>
  Student 123
</Link>
*/

// Pattern 4: Polling (Real-time updates)
/*
const { data } = useDashboardStats({
  refetchInterval: 30000, // Refetch every 30 seconds
});
*/
