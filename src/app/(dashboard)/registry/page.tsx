'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  ArrowRight,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  Save,
  Search,
  ShieldCheck,
  School,
  UserRoundX,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';

import { useAuth } from '@/components/auth/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  STUDENT_TRANSITION_DECISION_LABELS,
  StudentTransitionDecision,
} from '@/types';

type RegistryLane = 'all' | 'grade-school-to-jhs' | 'jhs-to-shs' | 'shs-to-college' | 'separated';

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
  separated: 'Separated Registry',
  other: 'Other',
};
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
  if (outcome === 'READY_FOR_PROMOTION')
    return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  if (outcome === 'PROMOTED') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (outcome === 'RETAINED') return 'border-amber-200 bg-amber-50 text-amber-800';
  if (outcome === 'TRANSFERRED_OUT') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (outcome === 'WITHDRAWN') return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-stone-200 bg-stone-50 text-stone-700';
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
        throw new Error(result.error || 'Failed to load registry');
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
      const message = error instanceof Error ? error.message : 'Failed to load registry';
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
      await fetchRegistry();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save transition decision';
      toast.error(message);
    } finally {
      setSavingDecisionStudentId(null);
    }
  };

  const selectedLaneLabel = useMemo(() => LANE_LABELS[lane], [lane]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="border-b border-emerald-100 bg-[linear-gradient(135deg,#f7fee7_0%,#ecfeff_58%,#fff7ed_100%)] p-6 lg:border-b-0 lg:border-r">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Badge className="mb-3 border-emerald-200 bg-white/80 text-emerald-700">
                  Academic Registry
                </Badge>
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                  Comprehensive Student Registry
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Grade 10 completion, Grade 12 graduation, college continuation, transfer, and
                  withdrawal records are tracked here without mixing them into manual archives.
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
                <p className="text-xs font-medium text-slate-500">Registry Records</p>
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
              <h2 className="mt-4 text-xl font-semibold">Archive stays manual.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Completed, graduated, transferred, and withdrawn students stay queryable here as
                academic outcomes. They are not placed in the archive unless an admin explicitly
                archives the record.
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
                <SelectItem value="all">All Registry Records</SelectItem>
                <SelectItem value="grade-school-to-jhs">Grade 6 to Junior High</SelectItem>
                <SelectItem value="jhs-to-shs">Grade 10 to Senior High</SelectItem>
                <SelectItem value="shs-to-college">Grade 12 to College</SelectItem>
                <SelectItem value="separated">Separated Registry</SelectItem>
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
                    Registry could not load: {errorMessage}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-sm text-slate-500">
                    No registry records match the current filters.
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
