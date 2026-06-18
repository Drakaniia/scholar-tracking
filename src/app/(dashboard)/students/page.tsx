'use client';

import { useCallback, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Archive,
  Award,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Layers,
  Loader2,
  Pencil,
  Plus,
} from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { StudentBatchForm } from '@/components/forms/student-batch-form';
import { StudentFeesManager } from '@/components/forms/student-fees-manager';
import { StudentForm } from '@/components/forms/student-form';
import { PageHeader } from '@/components/layout';
import {
  type ActiveFilter,
  ExportButton,
  FilterCard,
  FilterField,
  FilterSearchField,
} from '@/components/shared';
import {
  COMPACT_DIALOG_CONTENT_CLASS,
  DETAIL_DIALOG_CONTENT_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_FOOTER_CLASS,
  DIALOG_HEADER_CLASS,
  FORM_DIALOG_CONTENT_CLASS,
} from '@/components/shared/dialog-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/use-debounce';
import {
  queryKeys,
  useAcademicYears,
  useArchiveStudent,
  useBulkArchiveStudents,
  useCreateStudent,
  useCreateStudents,
  useStudent,
  useStudentFilterOptions,
  useStudents,
  useUpdateStudent,
} from '@/hooks/use-queries';
import {
  canManageStudentFees as canManageStudentFeesForRole,
  canManageStudentsAndScholarships,
  isAdminRole,
} from '@/lib/rbac';
import { cn, formatAcademicYearDisplay, formatCurrency } from '@/lib/utils';
import {
  AcademicYear,
  CreateStudentInput,
  Disbursement,
  GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  GradeLevel,
  GrantType,
  Student,
  StudentFees,
  StudentScholarship,
  TermType,
} from '@/types';

type StudentMutationData = {
  id?: number;
  lastName: string;
  firstName: string;
  middleInitial?: string;
  program: string;
  gradeLevel: GradeLevel;
  yearLevel: string;
  status: string;
  birthDate?: Date | null;
  termType?: TermType;
  fees?: {
    tuitionFee: number;
    otherFee: number;
    miscellaneousFee: number;
    laboratoryFee: number;
  };
  scholarships?: Array<{
    scholarshipId: number;
    awardDate: Date;
    grantAmount: number;
    grantType?: GrantType;
    scholarshipStatus: string;
    academicYearId?: number | null;
  }>;
};

// Pastel colors for scholarships
const PASTEL_COLORS = [
  'hsl(var(--pastel-purple))',
  'hsl(var(--pastel-blue))',
  'hsl(var(--pastel-pink))',
  'hsl(var(--pastel-orange))',
  'hsl(var(--pastel-green))',
];

// Function to get consistent color for a scholarship name
const getScholarshipColor = (scholarshipName: string): string => {
  let hash = 0;
  for (let i = 0; i < scholarshipName.length; i++) {
    hash = scholarshipName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PASTEL_COLORS.length;
  return PASTEL_COLORS[index];
};

function getScholarshipCountLabel(count: number) {
  if (count === 0) return 'No scholarship';
  if (count === 1) return '1 scholarship';
  return `${count} scholarships`;
}

function getScholarshipLoadText(count: number) {
  if (count === 0) return 'Unassigned';
  if (count === 1) return 'Single award';
  if (count === 2) return 'Dual award';
  if (count === 3) return 'Triple award';
  return 'Stacked awards';
}

function getCompactScholarshipName(name: string) {
  if (name.length <= 30) return name;
  return `${name.slice(0, 27)}...`;
}

function ScholarshipCountPill({ count }: { count: number }) {
  const isMultiple = count > 1;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold',
        count === 0 && 'border-slate-200 bg-slate-50 text-slate-500',
        count === 1 && 'border-emerald-200 bg-emerald-50 text-emerald-700',
        isMultiple && 'border-amber-200 bg-amber-50 text-amber-900'
      )}
    >
      {isMultiple ? <Layers className="h-3.5 w-3.5" /> : <Award className="h-3.5 w-3.5" />}
      {getScholarshipCountLabel(count)}
    </div>
  );
}

function ScholarshipPortfolioCell({
  scholarships,
  hoveredScholarshipId,
  onScholarshipHover,
}: {
  scholarships?: StudentScholarship[];
  hoveredScholarshipId: number | null;
  onScholarshipHover: (scholarshipId: number | null) => void;
}) {
  const assignedScholarships = scholarships?.filter((ss) => ss.scholarship) || [];
  const scholarshipCount = assignedScholarships.length;
  const totalGrantAmount = assignedScholarships.reduce(
    (sum, ss) => sum + Number(ss.grantAmount || 0),
    0
  );
  const multiple = scholarshipCount > 1;

  if (scholarshipCount === 0) {
    return (
      <div className="inline-flex min-w-[230px] items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        <span>No scholarship assigned</span>
        <ScholarshipCountPill count={0} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'min-w-[300px] rounded-lg border bg-white p-2 shadow-sm',
        multiple ? 'border-amber-200 bg-amber-50/40' : 'border-emerald-200 bg-emerald-50/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <ScholarshipCountPill count={scholarshipCount} />
          <p className="text-xs text-slate-500">{getScholarshipLoadText(scholarshipCount)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase text-slate-400">Total Grant</p>
          <p className="text-sm font-semibold text-slate-950">
            PHP {formatCurrency(totalGrantAmount)}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {assignedScholarships.map((ss, index) => {
          const scholarship = ss.scholarship;
          if (!scholarship) return null;
          const scholarshipColor = getScholarshipColor(scholarship.scholarshipName);

          return (
            <Popover
              key={ss.id}
              open={ss.id === hoveredScholarshipId}
              onOpenChange={(open) => onScholarshipHover(open ? ss.id : null)}
            >
              <PopoverTrigger asChild>
                <Badge
                  variant="outline"
                  style={{
                    backgroundColor: scholarshipColor,
                    color: '#334155',
                    borderColor: scholarshipColor,
                  }}
                  className="max-w-[220px] cursor-default gap-1.5 truncate py-1"
                  onMouseEnter={() => onScholarshipHover(ss.id)}
                  onMouseLeave={() => onScholarshipHover(null)}
                >
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white/85 px-1 text-[10px] font-bold text-slate-700">
                    {index + 1}
                  </span>
                  <span className="truncate">
                    {getCompactScholarshipName(scholarship.scholarshipName)}
                  </span>
                </Badge>
              </PopoverTrigger>
              <PopoverContent
                className="w-72 p-3"
                align="start"
                sideOffset={4}
                avoidCollisions
                hideWhenDetached={false}
                onMouseEnter={() => onScholarshipHover(ss.id)}
                onMouseLeave={() => onScholarshipHover(null)}
              >
                <div className="space-y-3">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50 text-xs font-bold text-amber-900">
                        {index + 1}
                      </span>
                      <h4 className="text-sm font-semibold">{scholarship.scholarshipName}</h4>
                    </div>
                    <p className="text-xs text-slate-500">
                      {getScholarshipCountLabel(scholarshipCount)} assigned to this student
                    </p>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Badge
                      variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                    </Badge>
                    <Badge
                      variant={ss.scholarshipStatus === 'Active' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {ss.scholarshipStatus}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Type</p>
                      <p className="font-medium text-slate-950">{scholarship.type}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Amount</p>
                      <p className="font-medium text-slate-950">
                        PHP {formatCurrency(Number(ss.grantAmount || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Award Date</p>
                      <p className="font-medium text-slate-950">
                        {new Date(ss.awardDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
    </div>
  );
}

interface StudentWithScholarships extends Student {
  scholarships: StudentScholarship[];
}

function getStudentFormDefaultValues(
  student: StudentWithScholarships
): Partial<CreateStudentInput> {
  return {
    lastName: student.lastName,
    firstName: student.firstName,
    middleInitial: student.middleInitial || '',
    program: student.program,
    gradeLevel: student.gradeLevel,
    yearLevel: student.yearLevel,
    status: student.status,
    birthDate: student.birthDate ? new Date(student.birthDate) : undefined,
    termType: student.termType,
    fees:
      student.fees && student.fees.length > 0
        ? {
            tuitionFee: student.fees[0].tuitionFee,
            otherFee: student.fees[0].otherFee,
            miscellaneousFee: student.fees[0].miscellaneousFee,
            laboratoryFee: student.fees[0].laboratoryFee,
          }
        : undefined,
    scholarships:
      student.scholarships?.map((ss) => ({
        id: ss.id,
        scholarshipId: ss.scholarshipId,
        academicYearId: ss.academicYearId ?? null,
        awardDate: new Date(ss.awardDate),
        grantAmount: ss.grantAmount,
        grantType: ss.grantType,
        scholarshipStatus: ss.scholarshipStatus,
      })) || [],
  };
}

function StudentsTableLoading({
  canManageStudents,
  isAdmin,
}: {
  canManageStudents: boolean;
  isAdmin: boolean;
}) {
  const checkboxCols = isAdmin ? 1 : 0;
  const bodyColumns = canManageStudents ? 7 : 6;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {isAdmin && <TableHead className="w-12" />}
            <TableHead>Name</TableHead>
            <TableHead>Grade Level</TableHead>
            <TableHead>Year Level</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scholarships</TableHead>
            {canManageStudents && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(6)].map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {isAdmin && <TableCell><Skeleton className="h-4 w-4 rounded-sm" /></TableCell>}
              {[...Array(bodyColumns)].map((__, columnIndex) => (
                <TableCell key={columnIndex}>
                  <Skeleton
                    className={cn(
                      'h-5',
                      columnIndex === 0 && 'w-44',
                      columnIndex === 1 && 'w-28 rounded-full',
                      columnIndex === 2 && 'w-24',
                      columnIndex === 3 && 'w-36',
                      columnIndex === 4 && 'w-20 rounded-full',
                      columnIndex === 5 && 'h-16 w-[300px] rounded-lg',
                      columnIndex === bodyColumns - 1 && canManageStudents && 'ml-auto w-20'
                    )}
                  />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function StudentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-4 h-7 w-32" />
        <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-36" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(2)].map((_, index) => (
            <Card key={index} className="border-2">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-8 w-8 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-72" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[...Array(3)].map((__, badgeIndex) => (
                      <Skeleton key={badgeIndex} className="h-6 w-20 rounded-full" />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((__, itemIndex) => (
                    <div key={itemIndex} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-36" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  );
}

function StudentEditFormSkeleton({
  hasError,
  onRetry,
}: {
  hasError: boolean;
  onRetry: () => void;
}) {
  if (hasError) {
    return (
      <div className={`${DIALOG_BODY_CLASS} flex flex-col items-center justify-center gap-4 py-12`}>
        <div className="text-center">
          <p className="font-medium text-slate-950">Unable to load student details</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Check your connection and try loading this record again.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className={`${DIALOG_BODY_CLASS} flex flex-col gap-6`}>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-28 w-full" />
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
      <DialogFooter className={DIALOG_FOOTER_CLASS}>
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-32" />
      </DialogFooter>
    </>
  );
}

interface StudentDetail extends Student {
  disbursements: Disbursement[];
  fees: StudentFees[];
}

export default function StudentsPage() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const canManageStudents = canManageStudentsAndScholarships(user?.role);
  const canManageStudentFees = canManageStudentFeesForRole(user?.role);
  const queryClient = useQueryClient();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300); // Debounce search by 300ms
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [scholarshipSourceFilter, setScholarshipSourceFilter] = useState<string>('all');
  const [scholarshipFilter, setScholarshipFilter] = useState<string>('all');
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithScholarships | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<number | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showFullDetails, setShowFullDetails] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [programs, setPrograms] = useState<string[]>([]);
  const [scholarships, setScholarships] = useState<
    Array<{ id: number; scholarshipName: string; source: string; _count?: { students: number } }>
  >([]);
  const [studentsWithoutScholarship, setStudentsWithoutScholarship] = useState<number>(0);
  const [gradeLevelCounts, setGradeLevelCounts] = useState<Record<string, number>>({});
  const [programCounts, setProgramCounts] = useState<Record<string, number>>({});
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [facetTotals, setFacetTotals] = useState({
    gradeLevel: 0,
    program: 0,
    status: 0,
    scholarship: 0,
  });
  const [dynamicScholarshipCounts, setDynamicScholarshipCounts] = useState<Record<string, number>>(
    {}
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredScholarshipId, setHoveredScholarshipId] = useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(() => new Set());
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);
  const [bulkArchiveResult, setBulkArchiveResult] = useState<{
    successCount: number;
    errorCount: number;
    archivedCount: number;
    alreadyArchivedCount: number;
    notFoundCount: number;
    results: Array<{ studentId: number; studentName: string; success: boolean; error?: string }>;
  } | null>(null);
  const studentPopulation = showArchived ? 'archived' : 'all';

  // TanStack Query hooks for data fetching
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    search: debouncedSearch,
    gradeLevel: gradeLevelFilter === 'all' ? undefined : gradeLevelFilter,
    program: programFilter === 'all' ? undefined : programFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    scholarshipSource: scholarshipSourceFilter === 'all' ? undefined : scholarshipSourceFilter,
    scholarshipId: scholarshipFilter === 'all' ? undefined : scholarshipFilter,
    academicYearId: academicYearFilter === 'all' ? undefined : academicYearFilter,
    archived: showArchived,
    population: studentPopulation,
    page,
    limit: 11,
  });

  const { data: studentDetail, isLoading: detailLoading } = useStudent(selectedStudent?.id || 0, {
    enabled: !!selectedStudent?.id,
  });
  const {
    data: editingStudentDetail,
    isError: editingStudentDetailError,
    refetch: refetchEditingStudent,
  } = useStudent(editingStudentId || 0, {
    enabled: dialogOpen && editingStudentId !== null,
  });

  const createStudentMutation = useCreateStudent();
  const createStudentsMutation = useCreateStudents();
  const updateStudentMutation = useUpdateStudent();
  const archiveStudentMutation = useArchiveStudent();
  const bulkArchiveMutation = useBulkArchiveStudents();
  const { data: academicYearsData } = useAcademicYears();
  const academicYears = ((academicYearsData?.data || []) as AcademicYear[]).slice().sort((a, b) => {
    const left = new Date(a.startDate).getTime();
    const right = new Date(b.startDate).getTime();
    return right - left;
  });

  const { data: filterOptionsData } = useStudentFilterOptions({
    search: debouncedSearch,
    gradeLevel: gradeLevelFilter,
    program: programFilter,
    status: statusFilter,
    scholarshipSource: scholarshipSourceFilter,
    scholarshipId: scholarshipFilter,
    academicYearId: academicYearFilter,
    archived: showArchived,
    population: studentPopulation,
  });

  // Update state when TanStack Query data changes
  useEffect(() => {
    if (studentsData) {
      setStudents((studentsData.data || []) as unknown as Student[]);
      setTotal(studentsData.total || 0);
      setTotalPages(studentsData.totalPages || 1);
    }
  }, [studentsData]);

  useEffect(() => {
    setLoading(studentsLoading);
  }, [studentsLoading]);

  useEffect(() => {
    if (studentDetail?.data && selectedStudent) {
      setSelectedStudent(studentDetail.data as unknown as StudentDetail);
    }
  }, [studentDetail, selectedStudent]);

  useEffect(() => {
    if (!editingStudentId || !editingStudentDetail?.data) return;

    const nextEditingStudent = editingStudentDetail.data as unknown as StudentWithScholarships;
    if (nextEditingStudent.id === editingStudentId) {
      setEditingStudent(nextEditingStudent);
    }
  }, [editingStudentDetail, editingStudentId]);

  useEffect(() => {
    setLoadingDetail(detailLoading);
  }, [detailLoading]);

  useEffect(() => {
    if (filterOptionsData) {
      const data = filterOptionsData.data as {
        programs: string[];
        scholarships: Array<{
          id: number;
          scholarshipName: string;
          source: string;
          _count?: { students: number };
        }>;
        studentsWithoutScholarship: number;
        gradeLevelCounts: Record<string, number>;
        programCounts: Record<string, number>;
        statusCounts: Record<string, number>;
        facetTotals?: {
          gradeLevel: number;
          program: number;
          status: number;
          scholarship: number;
        };
        dynamicScholarshipCounts: Record<string, number>;
      };
      setPrograms(data.programs || []);
      setScholarships(data.scholarships || []);
      setStudentsWithoutScholarship(data.studentsWithoutScholarship || 0);
      setGradeLevelCounts(data.gradeLevelCounts || {});
      setProgramCounts(data.programCounts || {});
      setStatusCounts(data.statusCounts || {});
      setFacetTotals({
        gradeLevel: data.facetTotals?.gradeLevel || 0,
        program: data.facetTotals?.program || 0,
        status: data.facetTotals?.status || 0,
        scholarship: data.facetTotals?.scholarship || 0,
      });
      setDynamicScholarshipCounts(data.dynamicScholarshipCounts || {});
    }
  }, [filterOptionsData]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1);
    setSelectAllAcrossPages(false);
  }, [
    debouncedSearch,
    gradeLevelFilter,
    programFilter,
    statusFilter,
    scholarshipSourceFilter,
    scholarshipFilter,
    academicYearFilter,
    showArchived,
  ]);

  useEffect(() => {
    if (
      scholarshipSourceFilter === 'all' ||
      scholarshipFilter === 'all' ||
      scholarshipFilter === 'none'
    ) {
      return;
    }

    const selectedScholarship = scholarships.find(
      (scholarship) => scholarship.id.toString() === scholarshipFilter
    );

    if (selectedScholarship && selectedScholarship.source !== scholarshipSourceFilter) {
      setScholarshipFilter('all');
    }
  }, [scholarshipSourceFilter, scholarshipFilter, scholarships]);

  const openDeleteDialog = (student: Student) => {
    setDeletingStudent(student);
    setDeleteDialogOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingStudent(null);
  };

  // Optimized hover handler with immediate response
  const handleScholarshipHover = useCallback((scholarshipId: number | null) => {
    setHoveredScholarshipId(scholarshipId);
  }, []);

  const closeStudentDialog = () => {
    setDialogOpen(false);
    setEditingStudent(null);
    setEditingStudentId(null);
  };

  const handleEdit = (student: Student) => {
    const cachedStudent = queryClient.getQueryData<{ data?: StudentWithScholarships }>(
      queryKeys.students.detail(student.id)
    )?.data;

    setEditingStudentId(student.id);
    setEditingStudent(cachedStudent || null);
    setDialogOpen(true);
  };

  const toStudentMutationData = (data: CreateStudentInput): StudentMutationData => ({
    lastName: data.lastName,
    firstName: data.firstName,
    middleInitial: data.middleInitial,
    program: data.program,
    gradeLevel: data.gradeLevel,
    yearLevel: data.yearLevel,
    status: data.status,
    birthDate: data.birthDate || null,
    termType: data.termType,
    fees: data.fees
      ? {
          tuitionFee: Number(data.fees.tuitionFee) || 0,
          otherFee: Number(data.fees.otherFee) || 0,
          miscellaneousFee: Number(data.fees.miscellaneousFee) || 0,
          laboratoryFee: Number(data.fees.laboratoryFee) || 0,
        }
      : undefined,
    scholarships: data.scholarships?.map((s) => ({
      scholarshipId: s.scholarshipId,
      awardDate: s.awardDate,
      grantAmount: s.grantAmount,
      grantType: s.grantType,
      scholarshipStatus: s.scholarshipStatus,
      academicYearId: s.academicYearId ?? null,
    })),
  });

  const handleFormSubmit = async (data: CreateStudentInput) => {
    setSubmitting(true);
    try {
      const mutationData = toStudentMutationData(data);

      if (editingStudent) {
        await updateStudentMutation.mutateAsync({ id: editingStudent.id, data: mutationData });
      } else {
        await createStudentMutation.mutateAsync(mutationData);
      }
      closeStudentDialog();
    } catch {
      // Error handling is already in mutation hooks
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchFormSubmit = async (studentEntries: CreateStudentInput[]) => {
    setSubmitting(true);
    try {
      await createStudentsMutation.mutateAsync({
        students: studentEntries.map(toStudentMutationData),
      });
      closeStudentDialog();
    } catch {
      // Error handling is already in mutation hooks
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetails = (studentId: number) => {
    setSelectedStudent({ id: studentId } as StudentDetail);
    setDetailDialogOpen(true);
    setShowFullDetails(false);
    setLoadingDetail(true);
    // useStudent hook will fetch automatically due to enabled: !!selectedStudent?.id
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;

    setSubmitting(true);

    try {
      await archiveStudentMutation.mutateAsync({ id: deletingStudent.id, action: 'archive' });
      setDeleteDialogOpen(false);
      setDeletingStudent(null);
    } catch {
      // Error handling is already in mutation hook
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk archive selection handlers
  const toggleStudentSelection = (studentId: number, checked: boolean) => {
    if (!isAdmin) return;
    if (!checked) {
      setSelectAllAcrossPages(false);
    }
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(studentId);
      } else {
        next.delete(studentId);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = (checked: boolean) => {
    if (!isAdmin) return;
    if (!checked) {
      setSelectAllAcrossPages(false);
    }
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      students.forEach((student) => {
        if (checked) {
          next.add(student.id);
        } else {
          next.delete(student.id);
        }
      });
      return next;
    });
  };

  const openBulkArchiveDialog = () => {
    if (selectedStudentIds.size === 0) return;
    setBulkArchiveResult(null);
    setBulkDialogOpen(true);
  };

  const handleBulkArchive = async () => {
    if (selectedStudentIds.size === 0 && !selectAllAcrossPages) return;

    setIsBulkArchiving(true);
    try {
      let payload: number[] | { selectAll: true; filters: Record<string, string | boolean | undefined> };

      if (selectAllAcrossPages) {
        payload = {
          selectAll: true,
          filters: {
            search: debouncedSearch || undefined,
            gradeLevel: gradeLevelFilter === 'all' ? undefined : gradeLevelFilter,
            program: programFilter === 'all' ? undefined : programFilter,
            status: statusFilter === 'all' ? undefined : statusFilter,
            scholarshipSource: scholarshipSourceFilter === 'all' ? undefined : scholarshipSourceFilter,
            scholarshipId: scholarshipFilter === 'all' ? undefined : scholarshipFilter,
            academicYearId: academicYearFilter === 'all' ? undefined : academicYearFilter,
            archived: false,
            population: 'active',
          },
        };
      } else {
        payload = Array.from(selectedStudentIds);
      }

      const result = await bulkArchiveMutation.mutateAsync(payload);
      setBulkArchiveResult(result.data ?? null);
      if (result.success || (result.data && result.data.errorCount === 0)) {
        setSelectedStudentIds(new Set());
        setSelectAllAcrossPages(false);
        setBulkDialogOpen(false);
      }
    } catch {
      // Error toast handled by mutation
    } finally {
      setIsBulkArchiving(false);
    }
  };

  const clearStudentFilters = () => {
    setSearch('');
    setGradeLevelFilter('all');
    setProgramFilter('all');
    setStatusFilter('all');
    setScholarshipSourceFilter('all');
    setScholarshipFilter('all');
    setAcademicYearFilter('all');
  };

  // Derived state for bulk selection
  const allVisibleStudentsSelected =
    students.length > 0 && students.every((student) => selectedStudentIds.has(student.id));
  const someStudentsSelected = students.some((student) => selectedStudentIds.has(student.id));
  const selectAllCheckState = allVisibleStudentsSelected
    ? true
    : someStudentsSelected
      ? 'indeterminate'
      : false;
  const effectiveSelectedCount = selectAllAcrossPages ? total : selectedStudentIds.size;
  const showSelectAllBanner =
    isAdmin &&
    !showArchived &&
    allVisibleStudentsSelected &&
    !selectAllAcrossPages &&
    total > students.length;

  const selectedScholarshipLabel =
    scholarshipFilter === 'none'
      ? 'No scholarship'
      : scholarships.find((scholarship) => scholarship.id.toString() === scholarshipFilter)
          ?.scholarshipName || 'Selected scholarship';
  const selectedAcademicYearLabel =
    academicYears.find((academicYear) => String(academicYear.id) === academicYearFilter)?.year
      ? formatAcademicYearDisplay(
          academicYears.find((academicYear) => String(academicYear.id) === academicYearFilter)?.year || ''
        )
      : 'Selected year';
  const studentActiveFilters: ActiveFilter[] = [
    ...(search.trim()
      ? [
          {
            key: 'search',
            label: 'Search',
            value: search.trim(),
            onRemove: () => setSearch(''),
          },
        ]
      : []),
    ...(gradeLevelFilter !== 'all'
      ? [
          {
            key: 'grade-level',
            label: 'Grade',
            value: GRADE_LEVEL_LABELS[gradeLevelFilter as GradeLevel] || gradeLevelFilter,
            onRemove: () => setGradeLevelFilter('all'),
          },
        ]
      : []),
    ...(programFilter !== 'all'
      ? [
          {
            key: 'program',
            label: 'Program',
            value: programFilter,
            onRemove: () => setProgramFilter('all'),
          },
        ]
      : []),
    ...(statusFilter !== 'all'
      ? [
          {
            key: 'status',
            label: 'Status',
            value: statusFilter,
            onRemove: () => setStatusFilter('all'),
          },
        ]
      : []),
    ...(scholarshipSourceFilter !== 'all'
      ? [
          {
            key: 'scholarship-source',
            label: 'Source',
            value: scholarshipSourceFilter === 'INTERNAL' ? 'Internal' : 'External',
            onRemove: () => setScholarshipSourceFilter('all'),
          },
        ]
      : []),
    ...(scholarshipFilter !== 'all'
      ? [
          {
            key: 'scholarship',
            label: 'Scholarship',
            value: selectedScholarshipLabel,
            onRemove: () => setScholarshipFilter('all'),
          },
        ]
      : []),
    ...(academicYearFilter !== 'all'
      ? [
          {
            key: 'academic-year',
            label: 'Year',
            value: selectedAcademicYearLabel,
            onRemove: () => setAcademicYearFilter('all'),
          },
        ]
      : []),
  ];
  const studentResultLabel = `${total.toLocaleString()} ${
    total === 1 ? 'student' : 'students'
  } found`;

  return (
    <div>
      <PageHeader
        title="Students"
        description="Track enrollment, scholarship assignments, and academic status."
      >
        <div className="flex flex-wrap gap-2">
          <ExportButton
            endpoint="/api/export/students"
            filename="detailed-student-scholarship-report"
            variant="outline"
            className="bg-white/90"
          />

          {canManageStudents && (
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                if (open) {
                  setDialogOpen(true);
                } else {
                  closeStudentDialog();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="gradient">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Students
                </Button>
              </DialogTrigger>
              <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
                <DialogHeader className={DIALOG_HEADER_CLASS}>
                  <DialogTitle>
                    {editingStudentId !== null ? 'Edit Student' : 'Add Students'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingStudentId !== null
                      ? 'Update student information'
                      : 'Enter student details to add new records'}
                  </DialogDescription>
                </DialogHeader>
                {editingStudentId !== null && !editingStudent ? (
                  <StudentEditFormSkeleton
                    hasError={editingStudentDetailError}
                    onRetry={() => void refetchEditingStudent()}
                  />
                ) : editingStudentId !== null ? (
                  <StudentForm
                    key={`edit-${editingStudentId}`}
                    defaultValues={
                      editingStudent ? getStudentFormDefaultValues(editingStudent) : undefined
                    }
                    onSubmit={handleFormSubmit}
                    onCancel={closeStudentDialog}
                    isEditing
                    loading={submitting}
                    canEditFees={canManageStudentFees}
                    canManageAcademicYears={canManageStudents}
                    studentName={
                      editingStudent
                        ? `${editingStudent.firstName} ${editingStudent.lastName}`
                        : undefined
                    }
                  />
                ) : (
                  <StudentBatchForm
                    onSubmit={handleBatchFormSubmit}
                    onCancel={closeStudentDialog}
                    loading={submitting}
                    canEditFees={canManageStudentFees}
                    canManageAcademicYears={canManageStudents}
                  />
                )}
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      <FilterCard
        title={showArchived ? 'Archived student filters' : 'Student filters'}
        resultLabel={studentResultLabel}
        activeFilters={studentActiveFilters}
        onClear={clearStudentFilters}
      >
        <FilterSearchField
          placeholder="Search by name, program, or scholarship year..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="md:col-span-2"
        />

        <FilterField label="Grade level">
          <Select value={gradeLevelFilter} onValueChange={setGradeLevelFilter}>
            <SelectTrigger className="h-10 w-full justify-between bg-white text-sm">
              <SelectValue placeholder="Grade Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Grades ({facetTotals.gradeLevel})</SelectItem>
              {GRADE_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {GRADE_LEVEL_LABELS[level]} ({gradeLevelCounts[level] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Program">
          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="h-10 w-full justify-between bg-white text-sm">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs ({facetTotals.program})</SelectItem>
              {programs
                .filter((program) => program)
                .map((program) => (
                  <SelectItem key={program} value={program}>
                    {program} ({programCounts[program] || 0})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Status">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 w-full justify-between bg-white text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status ({facetTotals.status})</SelectItem>
              <SelectItem value="Active">Active ({statusCounts['Active'] || 0})</SelectItem>
              <SelectItem value="Inactive">Inactive ({statusCounts['Inactive'] || 0})</SelectItem>
              <SelectItem value="Graduated">
                Graduated ({statusCounts['Graduated'] || 0})
              </SelectItem>
              <SelectItem value="Withdrawn">
                Withdrawn ({statusCounts['Withdrawn'] || 0})
              </SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Scholarship source">
          <Select value={scholarshipSourceFilter} onValueChange={setScholarshipSourceFilter}>
            <SelectTrigger className="h-10 w-full justify-between bg-white text-sm">
              <SelectValue placeholder="Scholarship Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scholarship Sources</SelectItem>
              <SelectItem value="INTERNAL">Internal</SelectItem>
              <SelectItem value="EXTERNAL">External</SelectItem>
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Scholarship" className="md:col-span-2 xl:col-span-1">
          <Select value={scholarshipFilter} onValueChange={setScholarshipFilter}>
            <SelectTrigger className="h-10 w-full justify-between bg-white text-sm">
              <SelectValue placeholder="Scholarship" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Scholarships ({facetTotals.scholarship})</SelectItem>
              <SelectItem value="none">No Scholarship ({studentsWithoutScholarship})</SelectItem>
              {scholarships.map((scholarship) => (
                <SelectItem key={scholarship.id} value={scholarship.id.toString()}>
                  {scholarship.scholarshipName} (
                  {dynamicScholarshipCounts[scholarship.id.toString()] || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Academic year">
          <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
            <SelectTrigger className="h-10 w-full justify-between bg-white text-sm">
              <SelectValue placeholder="Academic Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
                {academicYears.map((academicYear) => (
                <SelectItem key={academicYear.id} value={String(academicYear.id)}>
                  {formatAcademicYearDisplay(academicYear.year)}
                  {academicYear.isActive ? ' (Active)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterCard>

      {/* Students Table */}
      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowArchived(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    !showArchived
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  All Students
                </button>
                <button
                  onClick={() => setShowArchived(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    showArchived
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  Archived Students
                </button>
              </div>
              <Badge variant="outline" className="text-sm">
                Total: {total}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Bulk Archive Action Bar */}
          {isAdmin && !showArchived && selectedStudentIds.size > 0 && (
            <div className="border-b border-slate-200">
              <div className="flex items-center justify-between bg-primary/5 px-4 py-2.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-slate-950">
                    {effectiveSelectedCount}
                  </span>
                  <span className="text-muted-foreground">
                    student{effectiveSelectedCount !== 1 ? 's' : ''} selected
                    {selectAllAcrossPages && ' across all pages'}
                  </span>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={openBulkArchiveDialog}
                  disabled={isBulkArchiving}
                >
                  {isBulkArchiving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="mr-2 h-4 w-4" />
                  )}
                  Archive Selected
                </Button>
              </div>
              {/* Select all across pages banner */}
              {showSelectAllBanner && (
                <div className="flex items-center justify-between bg-amber-50 px-4 py-2 text-sm">
                  <span className="text-amber-900">
                    All <strong>{students.length}</strong> student{students.length !== 1 ? 's' : ''}{' '}
                    on this page selected.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="font-medium text-amber-900 hover:bg-amber-100 hover:text-amber-950"
                    onClick={() => setSelectAllAcrossPages(true)}
                  >
                    Select all <strong>{total}</strong> student{total !== 1 ? 's' : ''} matching
                    this search
                  </Button>
                </div>
              )}
            </div>
          )}

          {loading ? (
            <StudentsTableLoading canManageStudents={canManageStudents} isAdmin={isAdmin} />
          ) : students.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
              <p>No students found</p>
              <p className="text-sm">Add your first student to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {isAdmin && (
                      <TableHead className="w-12">
                        <Checkbox
                          aria-label="Select all students"
                          checked={selectAllCheckState}
                          onCheckedChange={(checked) => toggleSelectAllVisible(checked === true)}
                          disabled={!showArchived && students.length === 0}
                        />
                      </TableHead>
                    )}
                    <TableHead>Name</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Year Level</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scholarships</TableHead>
                    {canManageStudents && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      className={cn(
                        'cursor-pointer hover:bg-muted/50',
                        selectedStudentIds.has(student.id) && 'bg-primary/5'
                      )}
                      onClick={() => handleViewDetails(student.id)}
                    >
                      {isAdmin && (
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            aria-label={`Select ${student.lastName}, ${student.firstName}`}
                            checked={selectedStudentIds.has(student.id)}
                            onCheckedChange={(checked) =>
                              toggleStudentSelection(student.id, checked === true)
                            }
                            disabled={showArchived}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        {student.lastName}, {student.firstName} {student.middleInitial || ''}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{GRADE_LEVEL_LABELS[student.gradeLevel]}</Badge>
                      </TableCell>
                      <TableCell>{student.yearLevel}</TableCell>
                      <TableCell>{student.program}</TableCell>
                      <TableCell>
                        <Badge variant={student.status === 'Active' ? 'default' : 'secondary'}>
                          {student.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ScholarshipPortfolioCell
                          scholarships={student.scholarships}
                          hoveredScholarshipId={hoveredScholarshipId}
                          onScholarshipHover={handleScholarshipHover}
                        />
                      </TableCell>
                      {canManageStudents && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(student)}
                              className="cursor-pointer zoom-hover"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin &&
                              (!showArchived ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteDialog(student)}
                                  className="text-destructive hover:text-destructive cursor-pointer zoom-hover"
                                  title="Archive student"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    archiveStudentMutation.mutateAsync({
                                      id: student.id,
                                      action: 'unarchive',
                                    })
                                  }
                                  className="text-green-600 hover:text-green-700 cursor-pointer zoom-hover"
                                  title="Unarchive student"
                                >
                                  <Archive className="h-4 w-4" />
                                </Button>
                              ))}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {!loading && students.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4 px-4 pb-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className={COMPACT_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle>Archive Student</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive &quot;{deletingStudent?.firstName}{' '}
              {deletingStudent?.lastName}&quot;?
              {deletingStudent?.scholarships && deletingStudent.scholarships.length > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  Warning: This student has {deletingStudent.scholarships.length} scholarship(s)
                  assigned.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className={DIALOG_FOOTER_CLASS}>
            <Button variant="outline" onClick={closeDeleteDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting ? 'Archiving...' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Archive Confirmation Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className={COMPACT_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle>Bulk Archive Students</DialogTitle>
            <DialogDescription>
              You are about to archive {effectiveSelectedCount} student
              {effectiveSelectedCount !== 1 ? 's' : ''}
              {selectAllAcrossPages && ' matching the current filters'}.
              This action can be undone by unarchiving individual students.
              {selectAllAcrossPages && (
                <span className="mt-2 block rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                  <strong>Select all across pages active:</strong> All{' '}
                  {total} student{total !== 1 ? 's' : ''} matching the
                  current search and filters will be archived.
                </span>
              )}
              {!selectAllAcrossPages && effectiveSelectedCount > 0 && (
                <span className="mt-2 block text-destructive font-medium">
                  Warning: Archiving removes students from the active list. Scholarship
                  assignments will be preserved but hidden.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Bulk archive result feedback */}
          {bulkArchiveResult && (
            <div
              className={cn(
                'mx-6 rounded-md border px-3 py-2 text-sm',
                bulkArchiveResult.errorCount > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900'
              )}
            >
              <div className="flex items-start gap-2">
                {bulkArchiveResult.errorCount > 0 ? (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
                )}
                <div>
                  <p className="font-medium">
                    {bulkArchiveResult.archivedCount} archived,{' '}
                    {bulkArchiveResult.alreadyArchivedCount} already archived,
                    {bulkArchiveResult.notFoundCount} not found
                  </p>
                  {bulkArchiveResult.errorCount > 0 && (
                    <div className="mt-1 max-h-24 overflow-y-auto text-amber-800">
                      {bulkArchiveResult.results
                        .filter((r) => !r.success)
                        .map((r) => (
                          <p key={r.studentId}>
                            {r.studentName}: {r.error}
                          </p>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className={DIALOG_FOOTER_CLASS}>
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(false)}
              disabled={isBulkArchiving}
            >
              {bulkArchiveResult && bulkArchiveResult.errorCount === 0 ? 'Close' : 'Cancel'}
            </Button>
            {(!bulkArchiveResult || bulkArchiveResult.errorCount > 0) && (
              <Button
                variant="destructive"
                onClick={handleBulkArchive}
                disabled={isBulkArchiving}
              >
                {isBulkArchiving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Archiving...
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive {effectiveSelectedCount} Student
                    {effectiveSelectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Detail Dialog - Scholarships First */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className={DETAIL_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle>
              {selectedStudent &&
                `${selectedStudent.firstName} ${selectedStudent.lastName}'s Scholarships`}
            </DialogTitle>
            <DialogDescription>View scholarship information and student details</DialogDescription>
          </DialogHeader>
          <div className={DIALOG_BODY_CLASS}>
            {loadingDetail ? (
              <StudentDetailSkeleton />
            ) : selectedStudent ? (
              <div className="space-y-6">
                {/* Scholarships Section - PRIMARY VIEW */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Scholarships</h3>
                  <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">
                        Scholarship Load
                      </p>
                      <div className="mt-2">
                        <ScholarshipCountPill count={selectedStudent.scholarships?.length || 0} />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">Load Type</p>
                      <p className="mt-2 font-semibold text-slate-950">
                        {getScholarshipLoadText(selectedStudent.scholarships?.length || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-slate-500">Total Grant</p>
                      <p className="mt-2 text-lg font-semibold text-slate-950">
                        PHP{' '}
                        {formatCurrency(
                          selectedStudent.scholarships?.reduce(
                            (sum, ss) => sum + Number(ss.grantAmount || 0),
                            0
                          ) || 0
                        )}
                      </p>
                    </div>
                  </div>
                  {selectedStudent.scholarships && selectedStudent.scholarships.length > 0 ? (
                    <div className="space-y-4">
                      {selectedStudent.scholarships.map((ss, index) => {
                        const scholarship = ss.scholarship;
                        if (!scholarship) return null;

                        return (
                          <Card
                            key={ss.id}
                            className="border-2"
                            style={{
                              borderColor: getScholarshipColor(scholarship.scholarshipName),
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-3">
                                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-50 text-sm font-bold text-amber-900">
                                    {index + 1}
                                  </span>
                                  <div>
                                    <h4 className="text-lg font-semibold">
                                      {scholarship.scholarshipName}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">
                                      {scholarship.type}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Badge variant="outline">
                                    {index + 1} of {selectedStudent.scholarships?.length || 0}
                                  </Badge>
                                  <Badge
                                    variant={
                                      scholarship.source === 'INTERNAL' ? 'default' : 'secondary'
                                    }
                                  >
                                    {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                                  </Badge>
                                  <Badge
                                    variant={
                                      ss.scholarshipStatus === 'Active' ? 'default' : 'secondary'
                                    }
                                  >
                                    {ss.scholarshipStatus}
                                  </Badge>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Grant Amount</p>
                                  <p className="text-lg font-semibold">
                                    PHP {formatCurrency(Number(ss.grantAmount || 0))}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Award Date</p>
                                  <p>{new Date(ss.awardDate).toLocaleDateString()}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Academic Year</p>
                                  <p>{ss.academicYearRel?.year || 'No year'}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                      <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Scholarship Amount
                        </p>
                        <p className="text-2xl font-bold">
                          PHP{' '}
                          {formatCurrency(
                            selectedStudent.scholarships.reduce(
                              (sum, ss) => sum + Number(ss.grantAmount || 0),
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No scholarships assigned</p>
                  )}
                </div>

                {/* Show Full Details Button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowFullDetails(!showFullDetails)}
                >
                  {showFullDetails ? (
                    <>
                      <ChevronUp className="mr-2 h-4 w-4" />
                      Hide Full Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Show Full Details
                    </>
                  )}
                </Button>

                {/* Full Student Details - Hidden by default */}
                {showFullDetails && (
                  <>
                    {/* Basic Information */}
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold mb-4">Student Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                          <p className="text-lg">
                            {selectedStudent.lastName}, {selectedStudent.firstName}{' '}
                            {selectedStudent.middleInitial || ''}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <Badge
                            variant={selectedStudent.status === 'Active' ? 'default' : 'secondary'}
                          >
                            {selectedStudent.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Grade Level</p>
                          <Badge variant="outline">
                            {GRADE_LEVEL_LABELS[selectedStudent.gradeLevel]}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Year Level</p>
                          <p className="text-lg">{selectedStudent.yearLevel}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-sm font-medium text-muted-foreground">Program</p>
                          <p className="text-lg">{selectedStudent.program}</p>
                        </div>
                      </div>
                    </div>

                    {/* Disbursements */}
                    {selectedStudent.disbursements && selectedStudent.disbursements.length > 0 && (
                      <div className="border-t border-gray-200 pt-4">
                        <h3 className="text-lg font-semibold mb-4">Disbursement History</h3>
                        <div className="space-y-2">
                          {selectedStudent.disbursements.map((disbursement) => {
                            const scholarship = disbursement.scholarship;
                            if (!scholarship) return null;

                            return (
                              <div
                                key={disbursement.id}
                                className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                              >
                                <div>
                                  <p className="font-medium">{scholarship.scholarshipName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {disbursement.method}
                                  </p>
                                  <Badge
                                    variant={
                                      scholarship.source === 'INTERNAL' ? 'default' : 'secondary'
                                    }
                                    className="mt-1"
                                  >
                                    {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                                  </Badge>
                                </div>
                                <p className="text-lg font-semibold"></p>
                              </div>
                            );
                          })}
                        </div>
                        <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                          <p className="text-sm font-medium text-muted-foreground">
                            Total Disbursed
                          </p>
                          <p className="text-2xl font-bold">
                            {selectedStudent.disbursements
                              .reduce((sum, d) => sum + Number(d.amount), 0)
                              .toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Fees Information */}
                    <div className="border-t border-gray-200 pt-4">
                      <h3 className="text-lg font-semibold mb-4">Fee Information</h3>
                      <StudentFeesManager
                        studentId={selectedStudent.id}
                        readOnly={!canManageStudentFees}
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No data available</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
