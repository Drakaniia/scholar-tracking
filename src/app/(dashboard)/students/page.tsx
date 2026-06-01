'use client';

import { useCallback, useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Award,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Filter,
  Layers,
  Pencil,
  Plus,
  Search,
  X,
} from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { StudentFeesManager } from '@/components/forms/student-fees-manager';
import { StudentForm } from '@/components/forms/student-form';
import { PageHeader } from '@/components/layout';
import { ExportButton } from '@/components/shared';
import {
  COMPACT_DIALOG_CONTENT_CLASS,
  DETAIL_DIALOG_CONTENT_CLASS,
  DIALOG_BODY_CLASS,
  DIALOG_FOOTER_CLASS,
  DIALOG_HEADER_CLASS,
  FORM_DIALOG_CONTENT_CLASS,
} from '@/components/shared/dialog-layout';
import { ImportButton } from '@/components/shared/import-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  useArchiveStudent,
  useCreateStudent,
  useStudent,
  useStudentFilterOptions,
  useStudents,
  useUpdateStudent,
} from '@/hooks/use-queries';
import { cn, formatCurrency } from '@/lib/utils';
import {
  CreateStudentInput,
  Disbursement,
  GRADE_LEVELS,
  GRADE_LEVEL_LABELS,
  GradeLevel,
  GrantType,
  Student,
  StudentFees,
  StudentScholarship,
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
  fees?: {
    tuitionFee: number;
    otherFee: number;
    miscellaneousFee: number;
    laboratoryFee: number;
  };
  scholarships?: Array<{
    scholarshipId: number;
    awardDate: Date;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    grantType?: GrantType;
    scholarshipStatus: string;
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
                    <div>
                      <p className="text-slate-500">Term</p>
                      <p className="font-medium text-slate-950">
                        {ss.startTerm} - {ss.endTerm}
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

function StudentsTableLoading({ isAdmin }: { isAdmin: boolean }) {
  const bodyColumns = isAdmin ? 7 : 6;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Grade Level</TableHead>
            <TableHead>Year Level</TableHead>
            <TableHead>Program</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Scholarships</TableHead>
            {isAdmin && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(6)].map((_, rowIndex) => (
            <TableRow key={rowIndex}>
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
                      columnIndex === bodyColumns - 1 && isAdmin && 'ml-auto w-20'
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

interface StudentDetail extends Student {
  disbursements: Disbursement[];
  fees: StudentFees[];
}

export default function StudentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentWithScholarships | null>(null);
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
  const [filteredTotal, setFilteredTotal] = useState<number>(0);
  const [dynamicScholarshipCounts, setDynamicScholarshipCounts] = useState<Record<string, number>>(
    {}
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredScholarshipId, setHoveredScholarshipId] = useState<number | null>(null);

  // TanStack Query hooks for data fetching
  const { data: studentsData, isLoading: studentsLoading } = useStudents({
    search: debouncedSearch,
    gradeLevel: gradeLevelFilter === 'all' ? undefined : gradeLevelFilter,
    program: programFilter === 'all' ? undefined : programFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    scholarshipSource: scholarshipSourceFilter === 'all' ? undefined : scholarshipSourceFilter,
    scholarshipId: scholarshipFilter === 'all' ? undefined : scholarshipFilter,
    archived: showArchived,
    page,
    limit: 11,
  });

  const { data: studentDetail, isLoading: detailLoading } = useStudent(selectedStudent?.id || 0, {
    enabled: !!selectedStudent?.id,
  });

  const createStudentMutation = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();
  const archiveStudentMutation = useArchiveStudent();

  const { data: filterOptionsData } = useStudentFilterOptions({
    gradeLevel: gradeLevelFilter,
    program: programFilter,
    status: statusFilter,
    scholarshipSource: scholarshipSourceFilter,
    scholarshipId: scholarshipFilter,
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
        filteredTotal: number;
        dynamicScholarshipCounts: Record<string, number>;
      };
      setPrograms(data.programs || []);
      setScholarships(data.scholarships || []);
      setStudentsWithoutScholarship(data.studentsWithoutScholarship || 0);
      setGradeLevelCounts(data.gradeLevelCounts || {});
      setProgramCounts(data.programCounts || {});
      setStatusCounts(data.statusCounts || {});
      setFilteredTotal(data.filteredTotal || 0);
      setDynamicScholarshipCounts(data.dynamicScholarshipCounts || {});
    }
  }, [filterOptionsData]);

  useEffect(() => {
    // Reset to page 1 when filters change
    setPage(1);
  }, [
    debouncedSearch,
    gradeLevelFilter,
    programFilter,
    statusFilter,
    scholarshipSourceFilter,
    scholarshipFilter,
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

  const handleEdit = async (student: Student) => {
    try {
      // Fetch student details including fees
      const res = await fetch(`/api/students/${student.id}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setEditingStudent(json.data as StudentWithScholarships);
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
    }
  };

  const handleFormSubmit = async (data: CreateStudentInput) => {
    setSubmitting(true);
    try {
      const mutationData: StudentMutationData = {
        lastName: data.lastName,
        firstName: data.firstName,
        middleInitial: data.middleInitial,
        program: data.program,
        gradeLevel: data.gradeLevel,
        yearLevel: data.yearLevel,
        status: data.status,
        birthDate: data.birthDate || null,
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
          startTerm: s.startTerm,
          endTerm: s.endTerm,
          grantAmount: s.grantAmount,
          grantType: s.grantType,
          scholarshipStatus: s.scholarshipStatus,
        })),
      };

      if (editingStudent) {
        await updateStudentMutation.mutateAsync({ id: editingStudent.id, data: mutationData });
      } else {
        await createStudentMutation.mutateAsync(mutationData);
      }
      setDialogOpen(false);
      setEditingStudent(null);
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

  return (
    <div>
      <PageHeader title="Students" description="Manage student records">
        <div className="flex gap-2">
          <ExportButton
            endpoint="/api/export/students"
            filename="detailed-student-scholarship-report"
          />
          {isAdmin && (
            <ImportButton
              onImportComplete={() => {
                // Invalidate all queries to refresh data
                queryClient.invalidateQueries();
                sessionStorage.removeItem('dashboardData');
                sessionStorage.removeItem('detailedStudents');
                window.dispatchEvent(new Event('refreshDashboard'));
              }}
            />
          )}
          {isAdmin && (
            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) setEditingStudent(null);
              }}
            >
              <DialogTrigger asChild>
                <Button variant="gradient">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
                <DialogHeader className={DIALOG_HEADER_CLASS}>
                  <DialogTitle>{editingStudent ? 'Edit Student' : 'Add New Student'}</DialogTitle>
                  <DialogDescription>
                    {editingStudent
                      ? 'Update student information'
                      : 'Enter student details to add a new record'}
                  </DialogDescription>
                </DialogHeader>
                <StudentForm
                  key={editingStudent ? `edit-${editingStudent.id}` : 'create'}
                  defaultValues={
                    editingStudent
                      ? {
                          lastName: editingStudent.lastName,
                          firstName: editingStudent.firstName,
                          middleInitial: editingStudent.middleInitial || '',
                          program: editingStudent.program,
                          gradeLevel: editingStudent.gradeLevel,
                          yearLevel: editingStudent.yearLevel,
                          status: editingStudent.status,
                          birthDate: editingStudent.birthDate
                            ? new Date(editingStudent.birthDate)
                            : undefined,
                          fees:
                            editingStudent.fees && editingStudent.fees.length > 0
                              ? {
                                  tuitionFee: editingStudent.fees[0].tuitionFee,
                                  otherFee: editingStudent.fees[0].otherFee,
                                  miscellaneousFee: editingStudent.fees[0].miscellaneousFee,
                                  laboratoryFee: editingStudent.fees[0].laboratoryFee,
                                }
                              : undefined,
                          scholarships:
                            editingStudent.scholarships?.map((ss) => ({
                              scholarshipId: ss.scholarshipId,
                              awardDate: new Date(ss.awardDate),
                              startTerm: ss.startTerm,
                              endTerm: ss.endTerm,
                              grantAmount: ss.grantAmount,
                              scholarshipStatus: ss.scholarshipStatus,
                            })) || [],
                        }
                      : undefined
                  }
                  onSubmit={handleFormSubmit}
                  onCancel={() => setDialogOpen(false)}
                  isEditing={!!editingStudent}
                  loading={submitting}
                  studentName={
                    editingStudent
                      ? `${editingStudent.firstName} ${editingStudent.lastName}`
                      : undefined
                  }
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </PageHeader>

      {/* Filters */}
      <Card className="mb-4 border-gray-200">
        <CardContent className="p-3">
          <div className="flex flex-col gap-2">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or program..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            {/* Filter Section */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filters:</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 flex-1">
                <Select value={gradeLevelFilter} onValueChange={setGradeLevelFilter}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Grade Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades ({filteredTotal})</SelectItem>
                    {GRADE_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {GRADE_LEVEL_LABELS[level]} ({gradeLevelCounts[level] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={programFilter} onValueChange={setProgramFilter}>
                  <SelectTrigger className="h-8 w-[180px] text-xs">
                    <SelectValue placeholder="Program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Programs ({filteredTotal})</SelectItem>
                    {programs
                      .filter((program) => program)
                      .map((program) => (
                        <SelectItem key={program} value={program}>
                          {program} ({programCounts[program] || 0})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status ({filteredTotal})</SelectItem>
                    <SelectItem value="Active">Active ({statusCounts['Active'] || 0})</SelectItem>
                    <SelectItem value="Inactive">
                      Inactive ({statusCounts['Inactive'] || 0})
                    </SelectItem>
                    <SelectItem value="Graduated">
                      Graduated ({statusCounts['Graduated'] || 0})
                    </SelectItem>
                    <SelectItem value="Withdrawn">
                      Withdrawn ({statusCounts['Withdrawn'] || 0})
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Select value={scholarshipSourceFilter} onValueChange={setScholarshipSourceFilter}>
                  <SelectTrigger className="h-8 w-[190px] text-xs">
                    <SelectValue placeholder="Scholarship Source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scholarship Sources</SelectItem>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="EXTERNAL">External</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={scholarshipFilter} onValueChange={setScholarshipFilter}>
                  <SelectTrigger className="h-8 w-[200px] text-xs">
                    <SelectValue placeholder="Scholarship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scholarships ({filteredTotal})</SelectItem>
                    <SelectItem value="none">
                      No Scholarship ({studentsWithoutScholarship})
                    </SelectItem>
                    {scholarships.map((scholarship) => (
                      <SelectItem key={scholarship.id} value={scholarship.id.toString()}>
                        {scholarship.scholarshipName} (
                        {dynamicScholarshipCounts[scholarship.id.toString()] || 0})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Filters Button */}
                {(gradeLevelFilter !== 'all' ||
                  programFilter !== 'all' ||
                  statusFilter !== 'all' ||
                  scholarshipSourceFilter !== 'all' ||
                  scholarshipFilter !== 'all' ||
                  search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setGradeLevelFilter('all');
                      setProgramFilter('all');
                      setStatusFilter('all');
                      setScholarshipSourceFilter('all');
                      setScholarshipFilter('all');
                    }}
                    className="h-8 px-2 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
          {loading ? (
            <StudentsTableLoading isAdmin={isAdmin} />
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
                    <TableHead>Name</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Year Level</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Scholarships</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow
                      key={student.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(student.id)}
                    >
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
                      {isAdmin && (
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
                            {!showArchived ? (
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
                            )}
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
                                  <p className="text-muted-foreground">Start Term</p>
                                  <p>{ss.startTerm}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">End Term</p>
                                  <p>{ss.endTerm}</p>
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
                      <StudentFeesManager studentId={selectedStudent.id} readOnly={false} />
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
