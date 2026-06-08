'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ListFilter,
  Loader2,
  Save,
  School,
  Search,
  ShieldCheck,
  UserRoundX,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/auth-provider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import { STUDENT_TRANSITION_DECISION_LABELS, StudentTransitionDecision } from '@/types';

type RegistryLane = 'all' | 'grade-school-to-jhs' | 'jhs-to-shs' | 'shs-to-college' | 'separated';
type PromotionFilter = 'all-eligible' | 'grade-6' | 'grade-11' | 'grade-12' | 'graduating';

type PromotionPreviewStudent = {
  id: number;
  firstName: string;
  lastName: string;
  gradeLevel: string;
  yearLevel: string;
  program: string;
  termType: string;
  nextGradeLevel: string | null;
  nextYearLevel: string | null;
  nextProgram: string | null;
  nextTermType: string | null;
  action: 'PROMOTE' | 'GRADUATE' | 'RETAIN' | 'SEPARATE' | 'SKIP';
  transitionDecision: StudentTransitionDecision | null;
  requiresDecision: boolean;
  reason?: string;
};

type PromotionPreview = {
  activeAcademicYear: {
    id: number;
    year: string;
    promotionProcessedAt: string | null;
  } | null;
  totalStudents: number;
  preview: PromotionPreviewStudent[];
};

type PromotionPreviewResponse = {
  success: boolean;
  data?: PromotionPreview;
  error?: string;
};

type BulkPromotionStudentResult = {
  studentId: number;
  studentName: string;
  fromLevel: string;
  toLevel: string | null;
  action: PromotionPreviewStudent['action'] | 'ARCHIVE';
  success: boolean;
  error?: string;
};

type BulkPromotionRunResult = {
  cohortCount: number;
  selectedCount: number;
  archivedCount: number;
  promotedCount: number;
  graduatedCount: number;
  skippedCount: number;
  errorCount: number;
  results: BulkPromotionStudentResult[];
};

type BulkPromotionResponse = {
  success: boolean;
  message?: string;
  data?: BulkPromotionRunResult;
  error?: string;
};

type RegistryRow = {
  id: string;
  studentId: number;
  studentName: string;
  program: string;
  academicYear: string;
  fromLevel: string;
  toLevel: string;
  outcome: string;
  decision: string | null;
  decisionLabel: string;
  status: string;
  separatedAt: string | null;
  recordedAt: string | null;
  lane: RegistryLane | 'other';
  canDecide: boolean;
  requiresDecision: boolean;
};

type RegistryStats = {
  total: number;
  gradeSchoolToJhs: number;
  jhsToShs: number;
  shsToCollege: number;
  separated: number;
  transferred: number;
  withdrawn: number;
};

type RegistryResponse = {
  success: boolean;
  data: RegistryRow[];
  stats: RegistryStats;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error?: string;
};

const LANE_LABELS: Record<RegistryRow['lane'], string> = {
  all: 'All records',
  'grade-school-to-jhs': 'Grade 6 to Junior High',
  'jhs-to-shs': 'Grade 10 to Senior High',
  'shs-to-college': 'Grade 12 to College',
  separated: 'Separated Promotion Level',
  other: 'Other',
};
const PROMOTION_FILTER_LABELS: Record<PromotionFilter, string> = {
  'all-eligible': 'All Eligible Students',
  'grade-6': 'Grade 6',
  'grade-11': 'Grade 11',
  'grade-12': 'Grade 12',
  graduating: 'Graduating Students',
};
const PROMOTION_FILTERS: PromotionFilter[] = [
  'all-eligible',
  'grade-6',
  'grade-11',
  'grade-12',
  'graduating',
];
const OUTCOME_LABELS: Record<string, string> = {
  COMPLETED_JHS: 'Completed JHS',
  GRADUATED_SHS: 'Graduated SHS',
  GRADUATED_COLLEGE: 'Graduated College',
  TRANSFERRED_OUT: 'Transferred Out',
  PENDING_DECISION: 'Pending Decision',
  READY_FOR_PROMOTION: 'Ready for Promotion',
};
const GRADE_10_DECISIONS: StudentTransitionDecision[] = [
  'CONTINUE_SENIOR_HIGH',
  'COMPLETED_JHS',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
  'RETAINED',
];
const GRADE_12_DECISIONS: StudentTransitionDecision[] = [
  'CONTINUE_COLLEGE',
  'GRADUATED_SHS',
  'TRANSFERRED_OUT',
  'WITHDRAWN',
  'RETAINED',
];

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('en-PH', {
    dateStyle: 'medium',
    timeZone: 'Asia/Manila',
  }).format(new Date(value));
}

function formatOutcome(outcome: string) {
  if (OUTCOME_LABELS[outcome]) return OUTCOME_LABELS[outcome];
  return outcome
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function outcomeClassName(outcome: string) {
  if (outcome === 'PENDING_DECISION') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (outcome === 'READY_FOR_PROMOTION') return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (outcome === 'PROMOTED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (outcome === 'RETAINED') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (outcome === 'TRANSFERRED_OUT') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (outcome === 'WITHDRAWN') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-stone-200 bg-stone-50 text-stone-700';
}

function isPromotionSelectable(student: PromotionPreviewStudent) {
  return student.action === 'PROMOTE';
}

function isPromotionCohortStudent(student: PromotionPreviewStudent) {
  return !(student.action === 'RETAIN' || (student.action === 'SKIP' && !student.requiresDecision));
}

function isGraduatingPromotionStudent(student: PromotionPreviewStudent) {
  return (
    student.action === 'GRADUATE' ||
    student.action === 'SEPARATE' ||
    student.yearLevel === 'Grade 6' ||
    student.yearLevel === 'Grade 10' ||
    student.yearLevel === 'Grade 12'
  );
}

function matchesPromotionFilter(student: PromotionPreviewStudent, filter: PromotionFilter) {
  if (filter === 'grade-6') return student.yearLevel === 'Grade 6';
  if (filter === 'grade-11') return student.yearLevel === 'Grade 11';
  if (filter === 'grade-12') return student.yearLevel === 'Grade 12';
  if (filter === 'graduating') return isGraduatingPromotionStudent(student);
  return isPromotionCohortStudent(student);
}

function getPromotionActionLabel(student: PromotionPreviewStudent) {
  if (student.action === 'PROMOTE') return 'Promote to next grade level';
  if (student.action === 'GRADUATE') return 'Mark as Graduated/Completed';
  if (student.action === 'SEPARATE') {
    if (student.nextYearLevel === 'Graduated SHS' || student.nextYearLevel === 'Completed JHS') {
      return 'Mark as Graduated/Completed';
    }
    return 'Move to separated promotion level';
  }
  if (student.action === 'RETAIN') return 'Retain in current grade';
  return 'Decision required';
}

function getPromotionActionClassName(action: PromotionPreviewStudent['action']) {
  if (action === 'PROMOTE') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (action === 'GRADUATE') return 'border-orange-200 bg-orange-50 text-orange-700';
  if (action === 'SEPARATE') return 'border-rose-200 bg-rose-50 text-rose-700';
  if (action === 'RETAIN') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-slate-200 bg-slate-50 text-slate-600';
}

function formatPromotionTarget(student: PromotionPreviewStudent) {
  if (student.action === 'PROMOTE') {
    return `${student.nextGradeLevel} - ${student.nextYearLevel}`;
  }
  if (student.action === 'GRADUATE') return 'Graduated';
  if (student.action === 'SEPARATE') return student.nextYearLevel || 'Separated';
  if (student.action === 'RETAIN') return `Retain in ${student.yearLevel}`;
  return student.reason || 'Needs a transition decision';
}

function getDecisionOptions(row: RegistryRow) {
  return row.lane === 'jhs-to-shs' ? GRADE_10_DECISIONS : GRADE_12_DECISIONS;
}

function RegistryTableLoading() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-28" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-24" />
          </TableCell>
          <TableCell>
            <div className="flex min-w-[260px] items-center gap-2">
              <Skeleton className="h-7 w-24 rounded-md" />
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-md" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-32 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function PromotionQueueLoading() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index}>
          <TableCell className="w-12">
            <Skeleton className="h-4 w-4 rounded-sm" />
          </TableCell>
          <TableCell>
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-28" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-6 w-44 rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-40" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

function PromotionQueueFilterLoading() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-28 rounded-md" />
      ))}
    </div>
  );
}

function PromotionQueueSummaryLoading() {
  return (
    <div className="grid gap-2 text-sm sm:grid-cols-3 xl:min-w-[420px]">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-5 w-10" />
        </div>
      ))}
    </div>
  );
}

export default function RegistryPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RegistryRow[]>([]);
  const [stats, setStats] = useState<RegistryStats>({
    total: 0,
    gradeSchoolToJhs: 0,
    jhsToShs: 0,
    shsToCollege: 0,
    separated: 0,
    transferred: 0,
    withdrawn: 0,
  });
  const [search, setSearch] = useState('');
  const [lane, setLane] = useState<RegistryLane>('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [promotionPreview, setPromotionPreview] = useState<PromotionPreview | null>(null);
  const [promotionLoading, setPromotionLoading] = useState(true);
  const [promotionErrorMessage, setPromotionErrorMessage] = useState<string | null>(null);
  const [promotionFilter, setPromotionFilter] = useState<PromotionFilter>('all-eligible');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(() => new Set());
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [isBulkPromoting, setIsBulkPromoting] = useState(false);
  const [bulkPromotionResult, setBulkPromotionResult] = useState<BulkPromotionRunResult | null>(
    null
  );
  const [pendingDecisions, setPendingDecisions] = useState<
    Partial<Record<number, StudentTransitionDecision>>
  >({});
  const [savingDecisionStudentId, setSavingDecisionStudentId] = useState<number | null>(null);
  const debouncedSearch = useDebounce(search, 300);
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, lane, status]);

  const fetchRegistry = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        lane,
        status,
      });
      if (debouncedSearch) params.set('search', debouncedSearch);

      const response = await fetch(`/api/registry?${params.toString()}`, {
        credentials: 'include',
      });
      const result: RegistryResponse = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load promotion level');
      }

      const currentDecisions: Partial<Record<number, StudentTransitionDecision>> = {};
      result.data.forEach((row) => {
        if (row.canDecide && row.decision) {
          currentDecisions[row.studentId] = row.decision as StudentTransitionDecision;
        }
      });

      setRows(result.data);
      setStats(result.stats);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setPendingDecisions(currentDecisions);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load promotion level';
      setRows([]);
      setTotal(0);
      setTotalPages(1);
      setPendingDecisions({});
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, lane, page, status]);

  useEffect(() => {
    fetchRegistry();
  }, [fetchRegistry]);

  const fetchPromotionPreview = useCallback(async () => {
    setPromotionLoading(true);
    setPromotionErrorMessage(null);
    try {
      const response = await fetch('/api/academic-years/auto-promote', {
        credentials: 'include',
      });
      const result: PromotionPreviewResponse = await response.json();

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.error || 'Failed to load promotion preview');
      }

      setPromotionPreview(result.data);
      const selectableIds = new Set(
        result.data.preview.filter(isPromotionSelectable).map((student) => student.id)
      );
      setSelectedStudentIds((current) => {
        const next = new Set<number>();
        current.forEach((studentId) => {
          if (selectableIds.has(studentId)) next.add(studentId);
        });
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load promotion preview';
      setPromotionPreview(null);
      setSelectedStudentIds(new Set());
      setPromotionErrorMessage(message);
      toast.error(message);
    } finally {
      setPromotionLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotionPreview();
  }, [fetchPromotionPreview]);

  useEffect(() => {
    setSelectedStudentIds(new Set());
  }, [promotionFilter]);

  const handleDecisionChange = (studentId: number, decision: StudentTransitionDecision) => {
    setPendingDecisions((current) => ({
      ...current,
      [studentId]: decision,
    }));
  };

  const handleSaveDecision = async (row: RegistryRow) => {
    const decision = pendingDecisions[row.studentId];
    if (!decision) {
      toast.error('Choose a transition decision first.');
      return;
    }

    setSavingDecisionStudentId(row.studentId);
    try {
      const response = await fetch('/api/academic-years/auto-promote', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisions: [{ studentId: row.studentId, decision }],
        }),
        credentials: 'include',
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save transition decision');
      }

      toast.success(result.message || 'Transition decision saved.');
      await Promise.all([fetchRegistry(), fetchPromotionPreview()]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save transition decision';
      toast.error(message);
    } finally {
      setSavingDecisionStudentId(null);
    }
  };

  const selectedLaneLabel = useMemo(() => LANE_LABELS[lane], [lane]);
  const promotionStudents = useMemo(() => promotionPreview?.preview || [], [promotionPreview]);
  const filteredPromotionStudents = useMemo(
    () => promotionStudents.filter((student) => matchesPromotionFilter(student, promotionFilter)),
    [promotionFilter, promotionStudents]
  );
  const selectableFilteredPromotionStudents = useMemo(
    () => filteredPromotionStudents.filter(isPromotionSelectable),
    [filteredPromotionStudents]
  );
  const selectedPromotionStudents = useMemo(
    () => promotionStudents.filter((student) => selectedStudentIds.has(student.id)),
    [promotionStudents, selectedStudentIds]
  );
  const selectedPromotionSummary = useMemo(
    () => ({
      promote: selectedPromotionStudents.filter((student) => student.action === 'PROMOTE').length,
      archive: Math.max(filteredPromotionStudents.length - selectedPromotionStudents.length, 0),
    }),
    [filteredPromotionStudents.length, selectedPromotionStudents]
  );
  const allVisiblePromotionStudentsSelected =
    selectableFilteredPromotionStudents.length > 0 &&
    selectableFilteredPromotionStudents.every((student) => selectedStudentIds.has(student.id));
  const someVisiblePromotionStudentsSelected = selectableFilteredPromotionStudents.some((student) =>
    selectedStudentIds.has(student.id)
  );
  const visibleSelectAllState = allVisiblePromotionStudentsSelected
    ? true
    : someVisiblePromotionStudentsSelected
      ? 'indeterminate'
      : false;

  const togglePromotionStudent = (student: PromotionPreviewStudent, checked: boolean) => {
    if (!isAdmin || !isPromotionSelectable(student)) return;
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(student.id);
      } else {
        next.delete(student.id);
      }
      return next;
    });
  };

  const toggleVisiblePromotionStudents = (checked: boolean) => {
    if (!isAdmin) return;
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      selectableFilteredPromotionStudents.forEach((student) => {
        if (checked) {
          next.add(student.id);
        } else {
          next.delete(student.id);
        }
      });
      return next;
    });
  };

  const handleOpenBulkDialog = () => {
    if (!isAdmin) {
      toast.error('Only administrators can promote students.');
      return;
    }

    if (selectedPromotionStudents.length === 0) {
      toast.message('No continuing students selected. The current cohort will be archived.');
    }

    setIsBulkDialogOpen(true);
  };

  const handleBulkPromotion = async () => {
    if (filteredPromotionStudents.length === 0) return;

    setIsBulkPromoting(true);
    try {
      const response = await fetch('/api/academic-years/auto-promote/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentIds: selectedPromotionStudents.map((student) => student.id),
          cohortStudentIds: filteredPromotionStudents.map((student) => student.id),
        }),
        credentials: 'include',
      });
      const result: BulkPromotionResponse = await response.json();

      if (result.data) {
        setBulkPromotionResult(result.data);
      }

      if (!response.ok || !result.success) {
        toast.error(result.error || result.message || 'Failed to promote selected students.');
        return;
      }

      if (result.data?.errorCount) {
        toast.error(
          `Bulk promotion completed with ${result.data.errorCount} issue(s). Review the summary.`
        );
      } else {
        toast.success(result.message || 'Promotion cohort processed.');
      }

      setSelectedStudentIds(new Set());
      setIsBulkDialogOpen(false);
      await Promise.all([fetchRegistry(), fetchPromotionPreview()]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to promote selected students.';
      toast.error(message);
    } finally {
      setIsBulkPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="border-b border-emerald-100 bg-[linear-gradient(135deg,#f7fee7_0%,#ecfeff_58%,#fff7ed_100%)] p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge className="mb-3 border-emerald-200 bg-white/80 text-emerald-700">
                  Academic Promotion Level
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Comprehensive Student Promotion Level
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Grade 10 completion, Grade 12 graduation, college continuation, transfer, and
                  withdrawal records are tracked here alongside controlled promotion and archive
                  decisions.
                </p>
              </div>
              <div className="rounded-md border border-white/70 bg-white/80 px-4 py-3 text-right shadow-sm">
                <p className="text-xs font-medium uppercase text-slate-500">Current View</p>
                {loading ? (
                  <Skeleton className="mt-1 h-5 w-32" />
                ) : (
                  <p className="mt-1 text-sm font-semibold text-slate-950">{selectedLaneLabel}</p>
                )}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-md border border-white/80 bg-white/85 p-4 shadow-sm">
                <UsersRound className="h-4 w-4 text-emerald-700" />
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-12" />
                ) : (
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.total}</p>
                )}
                <p className="text-xs font-medium text-slate-500">Promotion Level Records</p>
              </div>
              <div className="rounded-md border border-white/80 bg-white/85 p-4 shadow-sm">
                <School className="h-4 w-4 text-lime-700" />
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-12" />
                ) : (
                  <p className="mt-3 text-2xl font-semibold text-slate-950">
                    {stats.gradeSchoolToJhs}
                  </p>
                )}
                <p className="text-xs font-medium text-slate-500">Grade 6 Completion</p>
              </div>
              <div className="rounded-md border border-white/80 bg-white/85 p-4 shadow-sm">
                <BookOpenCheck className="h-4 w-4 text-cyan-700" />
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-12" />
                ) : (
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.jhsToShs}</p>
                )}
                <p className="text-xs font-medium text-slate-500">Grade 10 Decisions</p>
              </div>
              <div className="rounded-md border border-white/80 bg-white/85 p-4 shadow-sm">
                <GraduationCap className="h-4 w-4 text-orange-700" />
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-12" />
                ) : (
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.shsToCollege}</p>
                )}
                <p className="text-xs font-medium text-slate-500">Grade 12 Decisions</p>
              </div>
              <div className="rounded-md border border-white/80 bg-white/85 p-4 shadow-sm">
                <UserRoundX className="h-4 w-4 text-rose-700" />
                {loading ? (
                  <Skeleton className="mt-3 h-8 w-12" />
                ) : (
                  <p className="mt-3 text-2xl font-semibold text-slate-950">{stats.separated}</p>
                )}
                <p className="text-xs font-medium text-slate-500">Separated Students</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between bg-slate-950 p-6 text-white">
            <div>
              <ShieldCheck className="h-7 w-7 text-emerald-300" />
              <h2 className="mt-4 text-xl font-semibold">Selection controls promotion.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Check only students continuing at Bosco/FSE. Unchecked students in the selected
                cohort are archived so they are not carried into the next academic level.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border border-white/10 bg-white/10 p-3">
                <p className="text-slate-400">Transferred</p>
                {loading ? (
                  <Skeleton className="mt-1 h-6 w-10 bg-slate-700" />
                ) : (
                  <p className="mt-1 text-lg font-semibold">{stats.transferred}</p>
                )}
              </div>
              <div className="rounded-md border border-white/10 bg-white/10 p-3">
                <p className="text-slate-400">Withdrawn</p>
                {loading ? (
                  <Skeleton className="mt-1 h-6 w-10 bg-slate-700" />
                ) : (
                  <p className="mt-1 text-lg font-semibold">{stats.withdrawn}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        className="rounded-lg border border-slate-200 bg-white shadow-sm"
        aria-busy={promotionLoading}
      >
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ListFilter className="h-5 w-5 text-emerald-700" />
              <h2 className="text-lg font-semibold text-slate-950">Bulk Promotion Queue</h2>
            </div>
            {promotionLoading ? (
              <Skeleton className="mt-2 h-4 w-56" />
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                {promotionPreview?.activeAcademicYear
                  ? `${promotionPreview.activeAcademicYear.year} active promotion preview`
                  : 'Active promotion preview'}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="rounded-md border border-slate-200 px-3 py-2 text-sm">
              {promotionLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <>
                  <span className="font-semibold text-slate-950">
                    {selectedPromotionStudents.length}
                  </span>{' '}
                  <span className="text-slate-500">selected</span>
                </>
              )}
            </div>
            <Button
              type="button"
              onClick={handleOpenBulkDialog}
              disabled={
                !isAdmin ||
                promotionLoading ||
                filteredPromotionStudents.length === 0 ||
                !!promotionPreview?.activeAcademicYear?.promotionProcessedAt
              }
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isBulkPromoting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GraduationCap className="h-4 w-4" />
              )}
              Process Current Cohort
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
          {promotionLoading ? (
            <PromotionQueueFilterLoading />
          ) : (
            <div className="flex flex-wrap gap-2">
              {PROMOTION_FILTERS.map((filter) => (
                <Button
                  key={filter}
                  type="button"
                  variant={promotionFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPromotionFilter(filter)}
                  className={cn(
                    'h-9',
                    promotionFilter === filter && 'bg-slate-950 text-white hover:bg-slate-800'
                  )}
                >
                  {PROMOTION_FILTER_LABELS[filter]}
                </Button>
              ))}
            </div>
          )}
          {promotionLoading ? (
            <PromotionQueueSummaryLoading />
          ) : (
            <div className="grid gap-2 text-sm sm:grid-cols-3 xl:min-w-[420px]">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2">
                <p className="text-xs font-medium text-emerald-700">Promote</p>
                <p className="font-semibold text-emerald-950">
                  {selectedPromotionSummary.promote}
                </p>
              </div>
              <div className="rounded-md border border-orange-200 bg-orange-50 px-3 py-2">
                <p className="text-xs font-medium text-orange-700">Archive Unchecked</p>
                <p className="font-semibold text-orange-950">{selectedPromotionSummary.archive}</p>
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">Visible Eligible</p>
                <p className="font-semibold text-slate-950">
                  {selectableFilteredPromotionStudents.length}
                </p>
              </div>
            </div>
          )}
        </div>

        {promotionPreview?.activeAcademicYear?.promotionProcessedAt && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This academic year has already been promoted. Selected bulk promotion is unavailable
            until the last promotion is undone.
          </div>
        )}

        {bulkPromotionResult && (
          <div
            className={cn(
              'border-b px-4 py-3',
              bulkPromotionResult.errorCount > 0
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
            )}
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                {bulkPromotionResult.errorCount > 0 ? (
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                ) : (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                )}
                <div>
                  <p className="font-semibold text-slate-950">Last bulk promotion summary</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {bulkPromotionResult.promotedCount} promoted,{' '}
                    {bulkPromotionResult.archivedCount} archived, {bulkPromotionResult.skippedCount}{' '}
                    skipped, {bulkPromotionResult.errorCount} issue(s).
                  </p>
                </div>
              </div>
              {bulkPromotionResult.errorCount > 0 && (
                <div className="max-w-xl text-sm text-amber-900">
                  {bulkPromotionResult.results
                    .filter((result) => !result.success)
                    .slice(0, 3)
                    .map((result) => (
                      <p key={result.studentId}>
                        {result.studentName}: {result.error}
                      </p>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Select all visible eligible students"
                    checked={visibleSelectAllState}
                    onCheckedChange={(checked) => toggleVisiblePromotionStudents(checked === true)}
                    disabled={
                      !isAdmin ||
                      promotionLoading ||
                      selectableFilteredPromotionStudents.length === 0 ||
                      !!promotionPreview?.activeAcademicYear?.promotionProcessedAt
                    }
                  />
                </TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Current Level</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Next Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promotionLoading ? (
                <PromotionQueueLoading />
              ) : promotionErrorMessage ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-sm text-rose-600">
                    Promotion preview could not load: {promotionErrorMessage}
                  </TableCell>
                </TableRow>
              ) : filteredPromotionStudents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-sm text-slate-500">
                    No students match this promotion filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPromotionStudents.map((student) => {
                  const selectable =
                    isAdmin &&
                    isPromotionSelectable(student) &&
                    !promotionPreview?.activeAcademicYear?.promotionProcessedAt;
                  const selected = selectedStudentIds.has(student.id);

                  return (
                    <TableRow
                      key={student.id}
                      className={cn(
                        selected && 'bg-emerald-50/50',
                        !isPromotionSelectable(student) && 'bg-slate-50/60'
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          aria-label={`Select ${student.lastName}, ${student.firstName}`}
                          checked={selected}
                          onCheckedChange={(checked) =>
                            togglePromotionStudent(student, checked === true)
                          }
                          disabled={!selectable || isBulkPromoting}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">
                            {student.lastName}, {student.firstName}
                          </p>
                          <p className="text-xs text-slate-500">{student.program}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {student.gradeLevel} - {student.yearLevel}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn(
                            'whitespace-nowrap',
                            getPromotionActionClassName(student.action)
                          )}
                        >
                          {getPromotionActionLabel(student)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[340px] text-sm text-slate-700">
                          <p className="font-medium">{formatPromotionTarget(student)}</p>
                          {student.nextProgram && student.action === 'PROMOTE' && (
                            <p className="text-xs text-slate-500">
                              {student.nextProgram}
                              {student.nextTermType ? ` - ${student.nextTermType}` : ''}
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-200 p-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          {promotionLoading ? (
            <Skeleton className="h-4 w-56" />
          ) : (
            <p>
              Showing {filteredPromotionStudents.length} of {promotionPreview?.totalStudents || 0}{' '}
              active students
            </p>
          )}
          {!isAdmin && <p>Administrator access is required for bulk promotion.</p>}
        </div>
      </section>

      <AlertDialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Process Promotion Cohort</AlertDialogTitle>
            <AlertDialogDescription>
              Checked students will continue at Bosco/FSE and be promoted. Unchecked students in
              this filtered cohort will be archived.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Cohort</p>
                <p className="mt-1 text-xl font-semibold text-slate-950">
                  {filteredPromotionStudents.length}
                </p>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs font-medium text-emerald-700">Promote</p>
                <p className="mt-1 text-xl font-semibold text-emerald-950">
                  {selectedPromotionSummary.promote}
                </p>
              </div>
              <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
                <p className="text-xs font-medium text-orange-700">Archive</p>
                <p className="mt-1 text-xl font-semibold text-orange-950">
                  {selectedPromotionSummary.archive}
                </p>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Next Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromotionStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        {student.lastName}, {student.firstName}
                      </TableCell>
                      <TableCell>
                        {selectedStudentIds.has(student.id)
                          ? 'Promote to next grade level'
                          : 'Archive as non-continuing'}
                      </TableCell>
                      <TableCell>
                        {selectedStudentIds.has(student.id)
                          ? formatPromotionTarget(student)
                          : 'Archived'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkPromoting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleBulkPromotion();
              }}
              disabled={isBulkPromoting}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isBulkPromoting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm Cohort Processing
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search student, year, pathway..."
              className="pl-9"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:flex">
            <Select value={lane} onValueChange={(value) => setLane(value as RegistryLane)}>
              <SelectTrigger className="h-10 w-full lg:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Promotion Level Records</SelectItem>
                <SelectItem value="grade-school-to-jhs">Grade 6 to Junior High</SelectItem>
                <SelectItem value="jhs-to-shs">Grade 10 to Senior High</SelectItem>
                <SelectItem value="shs-to-college">Grade 12 to College</SelectItem>
                <SelectItem value="separated">Separated Promotion Level</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-10 w-full lg:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="PENDING_DECISION">Pending Decision</SelectItem>
                <SelectItem value="READY_FOR_PROMOTION">Ready for Promotion</SelectItem>
                <SelectItem value="PROMOTED">Promoted</SelectItem>
                <SelectItem value="COMPLETED_JHS">Completed JHS</SelectItem>
                <SelectItem value="GRADUATED_SHS">Graduated SHS</SelectItem>
                <SelectItem value="TRANSFERRED_OUT">Transferred Out</SelectItem>
                <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                <SelectItem value="RETAINED">Retained</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid border-b border-slate-200 lg:grid-cols-3">
          <div className="flex items-center gap-3 border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-lime-50 text-lime-700">
              <School className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-950">Grade 6 pathway</p>
              <p className="text-sm text-slate-500">Grade School completion to Junior High entry</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-3 border-b border-slate-200 p-4 lg:border-b-0 lg:border-r">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-cyan-700">
              <BookOpenCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-950">Grade 10 pathway</p>
              <p className="text-sm text-slate-500">Junior High completion to Senior High entry</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
          </div>
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-orange-700">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-950">Grade 12 pathway</p>
              <p className="text-sm text-slate-500">Senior High graduation to College entry</p>
            </div>
            <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Student</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Pathway</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Outcome</TableHead>
                <TableHead>Recorded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <RegistryTableLoading />
              ) : errorMessage ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-rose-600">
                    Promotion Level could not load: {errorMessage}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-slate-500">
                    No promotion level records match the current filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const selectedDecision = pendingDecisions[row.studentId] || 'UNSET';
                  const isSavingDecision = savingDecisionStudentId === row.studentId;
                  const canEditDecision = isAdmin && row.canDecide;

                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-slate-950">{row.studentName}</p>
                          <p className="text-xs text-slate-500">{row.program}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-700">
                        {row.academicYear}
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-[260px] items-center gap-2 text-sm">
                          <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-700">
                            {row.fromLevel}
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                            {row.toLevel}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {canEditDecision ? (
                          <div className="flex min-w-[300px] items-center gap-2">
                            <Select
                              value={selectedDecision}
                              onValueChange={(value) => {
                                if (value !== 'UNSET') {
                                  handleDecisionChange(
                                    row.studentId,
                                    value as StudentTransitionDecision
                                  );
                                }
                              }}
                              disabled={isSavingDecision}
                            >
                              <SelectTrigger className="h-9 flex-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UNSET" disabled>
                                  Choose decision
                                </SelectItem>
                                {getDecisionOptions(row).map((decision) => (
                                  <SelectItem key={decision} value={decision}>
                                    {STUDENT_TRANSITION_DECISION_LABELS[decision]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleSaveDecision(row)}
                              disabled={selectedDecision === 'UNSET' || isSavingDecision}
                            >
                              {isSavingDecision ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                              Save
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-700">{row.decisionLabel}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('whitespace-nowrap', outcomeClassName(row.outcome))}
                        >
                          {formatOutcome(row.outcome)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {formatDate(row.recordedAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Showing {rows.length} of {total} records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              disabled={page === totalPages || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
