'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { keepPreviousData } from '@tanstack/react-query';
import {
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GraduationCap,
  Pencil,
  Plus,
  User,
} from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { ScholarshipForm } from '@/components/forms';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  useCreateScholarship,
  useDeleteScholarship,
  useScholarship,
  useScholarshipFilterOptions,
  useScholarships,
  useUpdateScholarship,
} from '@/hooks/use-queries';
import { canManageStudentsAndScholarships, isAdminRole } from '@/lib/rbac';
import { buildScholarshipFormDefaultValues } from '@/lib/scholarship-form-defaults';
import { getCoveredTermsLabel } from '@/lib/terms';
import { cn, formatCurrency } from '@/lib/utils';
import type { CreateScholarshipInput, GrantType, Scholarship, StudentScholarship } from '@/types';
import { GRADE_LEVEL_LABELS, SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS } from '@/types';

// Pastel colors for scholarship types
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

interface ScholarshipWithCount extends Scholarship {
  _count?: {
    students: number;
  };
}

interface ScholarshipDetail extends ScholarshipWithCount {
  students: Array<
    StudentScholarship & {
      student: {
        firstName: string;
        lastName: string;
        middleInitial: string | null;
        program: string;
        gradeLevel: string;
        yearLevel: string;
        status: string;
        fees: Array<{
          percentSubsidy: number;
          amountSubsidy: number;
        }>;
      };
    }
  >;
}

interface ScholarshipCounts {
  total: number;
  internal: number;
  external: number;
}

const SCHOLARSHIP_TABLE_HEAD_CLASS =
  'px-1.5 py-2 text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-500 whitespace-normal';
const SCHOLARSHIP_TABLE_CELL_CLASS = 'px-1.5 py-2 align-top text-xs leading-snug whitespace-normal';
const SCHOLARSHIP_BADGE_CLASS =
  'h-auto max-w-full justify-start whitespace-normal px-1.5 py-0.5 text-[11px] leading-tight';
const ASSIGNED_STUDENTS_PREVIEW_LIMIT = 5;

function getGrantTypeLabel(grantType: GrantType) {
  if (grantType === 'TUITION_ONLY') return 'Free Tuition';
  if (grantType === 'FULL') return 'Full Grant';
  if (grantType === 'NONE') return 'None';
  return grantType.replace('_', ' ');
}

function getScholarshipAmountLabel(scholarship: ScholarshipWithCount) {
  if (scholarship.grantType === 'TUITION_ONLY') return 'Free Tuition';
  if (scholarship.grantType === 'NONE') return 'No cash grant';
  return formatCurrency(scholarship.amount);
}

function getStudentCountLabel(count: number) {
  return `${count} ${count === 1 ? 'student' : 'students'}`;
}

function ScholarshipFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-white px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 min-w-0 text-sm text-slate-950">{children}</div>
    </div>
  );
}

function ScholarshipTableLoading({ canManageScholarships }: { canManageScholarships: boolean }) {
  const columns = canManageScholarships ? 10 : 9;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <Table className="table-fixed text-xs">
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Scholarship</TableHead>
            <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Sponsor</TableHead>
            <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Type</TableHead>
            <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Grant</TableHead>
            <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Terms</TableHead>
            <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Source</TableHead>
            <TableHead className={cn(SCHOLARSHIP_TABLE_HEAD_CLASS, 'text-right')}>Amount</TableHead>
            <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Students</TableHead>
            <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Status</TableHead>
            {canManageScholarships && (
              <TableHead className={cn(SCHOLARSHIP_TABLE_HEAD_CLASS, 'text-right')}>
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...Array(6)].map((_, rowIndex) => (
            <TableRow key={rowIndex}>
              {[...Array(columns)].map((_, columnIndex) => (
                <TableCell key={columnIndex} className={SCHOLARSHIP_TABLE_CELL_CLASS}>
                  <Skeleton
                    className={`h-4 animate-pulse rounded bg-muted ${
                      columnIndex === 0
                        ? 'w-full'
                        : columnIndex === 6
                          ? 'ml-auto w-20'
                          : canManageScholarships && columnIndex === columns - 1
                            ? 'ml-auto w-14'
                            : 'w-full'
                    }`}
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

function ScholarshipDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="mb-4 h-7 w-48" />
        <Card className="border-2">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              {[...Array(10)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className={index === 6 ? 'h-8 w-36' : 'h-6 w-44'} />
                </div>
              ))}
              <div className="col-span-2 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-16 w-full rounded-lg" />
              </div>
              <div className="col-span-2 space-y-2">
                <Skeleton className="h-4 w-28" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[...Array(4)].map((_, feeIndex) => (
                    <Skeleton key={feeIndex} className="h-20 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="border-t border-gray-200 pt-4">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <Card key={index} className="border">
              <CardContent className="p-4">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-60" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  {[...Array(4)].map((__, itemIndex) => (
                    <div key={itemIndex} className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function ScholarshipsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isAdmin = !authLoading && isAdminRole(user?.role);
  const canManageScholarships = !authLoading && canManageStudentsAndScholarships(user?.role);
  const [scholarships, setScholarships] = useState<ScholarshipWithCount[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
  const [deletingScholarship, setDeletingScholarship] = useState<Scholarship | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showAllAssignedStudents, setShowAllAssignedStudents] = useState(false);

  // TanStack Query hooks for data fetching
  const {
    data: scholarshipsData,
    isFetching: scholarshipsFetching,
    isLoading: scholarshipsLoading,
  } = useScholarships(
    {
      search: debouncedSearch,
      source: sourceFilter === 'all' ? undefined : sourceFilter,
      page,
      limit: 10,
    },
    { placeholderData: keepPreviousData }
  );

  const { data: scholarshipDetail, isLoading: detailLoading } = useScholarship(
    selectedScholarship?.id || 0,
    { enabled: !!selectedScholarship?.id }
  );

  const createScholarshipMutation = useCreateScholarship();
  const updateScholarshipMutation = useUpdateScholarship();
  const deleteScholarshipMutation = useDeleteScholarship();

  // TanStack Query hook for filter options
  const { data: filterOptionsData } = useScholarshipFilterOptions({
    source: sourceFilter,
  });

  const [counts, setCounts] = useState<ScholarshipCounts>({ total: 0, internal: 0, external: 0 });

  // Update counts when filter options data changes
  useEffect(() => {
    if (filterOptionsData?.data) {
      setCounts(filterOptionsData.data as ScholarshipCounts);
    }
  }, [filterOptionsData]);

  // Update state when TanStack Query data changes
  useEffect(() => {
    if (scholarshipsData) {
      setScholarships((scholarshipsData.data || []) as ScholarshipWithCount[]);
      setTotal(scholarshipsData.total || 0);
      setTotalPages(scholarshipsData.totalPages || 1);
    }
  }, [scholarshipsData]);

  useEffect(() => {
    if (scholarshipDetail?.data && selectedScholarship) {
      setSelectedScholarship(scholarshipDetail.data as ScholarshipDetail);
    }
  }, [scholarshipDetail, selectedScholarship]);

  useEffect(() => {
    setLoadingDetail(detailLoading);
  }, [detailLoading]);

  useEffect(() => {
    // Reset to page 1 when filter changes
    setPage(1);
  }, [sourceFilter, debouncedSearch]);

  const handleCreate = async (data: CreateScholarshipInput) => {
    setSubmitting(true);
    try {
      await createScholarshipMutation.mutateAsync(data);
      setDialogOpen(false);
    } catch {
      // Error handling is already in mutation hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (data: CreateScholarshipInput) => {
    if (!editingScholarship) return;

    setSubmitting(true);

    try {
      await updateScholarshipMutation.mutateAsync({ id: editingScholarship.id, data });
      setDialogOpen(false);
      setEditingScholarship(null);
    } catch {
      // Error handling is already in mutation hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingScholarship) return;

    setSubmitting(true);

    try {
      await deleteScholarshipMutation.mutateAsync(deletingScholarship.id);
      setDeleteDialogOpen(false);
      setDeletingScholarship(null);
    } catch {
      // Error handling is already in mutation hook
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingScholarship(null);
    setDialogOpen(true);
  };

  const openEditDialog = (scholarship: Scholarship) => {
    setEditingScholarship(scholarship);
    setDialogOpen(true);
  };

  const openDeleteDialog = (scholarship: Scholarship) => {
    setDeletingScholarship(scholarship);
    setDeleteDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingScholarship(null);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingScholarship(null);
  };

  const handleViewDetails = (scholarshipId: number) => {
    setSelectedScholarship({ id: scholarshipId } as ScholarshipDetail);
    setDetailDialogOpen(true);
    setLoadingDetail(true);
    setShowAllAssignedStudents(false);
    // useScholarship hook will fetch automatically due to enabled: !!selectedScholarship?.id
  };

  const listLoading = scholarshipsLoading || scholarshipsFetching;
  const showPagination = scholarships.length > 0;
  const scholarshipTableColumnWidths = canManageScholarships
    ? [18, 12, 8, 10, 10, 8, 9, 7, 7, 9]
    : [20, 14, 9, 11, 11, 9, 10, 8, 8];
  const clearScholarshipFilters = () => {
    setSearch('');
    setSourceFilter('all');
  };
  const scholarshipActiveFilters: ActiveFilter[] = [
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
    ...(sourceFilter !== 'all'
      ? [
          {
            key: 'source',
            label: 'Source',
            value:
              SCHOLARSHIP_SOURCE_LABELS[sourceFilter as keyof typeof SCHOLARSHIP_SOURCE_LABELS] ||
              sourceFilter,
            onRemove: () => setSourceFilter('all'),
          },
        ]
      : []),
  ];
  const scholarshipResultLabel = `${total.toLocaleString()} ${
    total === 1 ? 'scholarship' : 'scholarships'
  } found`;
  const assignedStudents = selectedScholarship?.students || [];
  const assignedStudentCount = assignedStudents.length;
  const hiddenAssignedStudentCount = Math.max(
    assignedStudentCount - ASSIGNED_STUDENTS_PREVIEW_LIMIT,
    0
  );
  const visibleAssignedStudents = showAllAssignedStudents
    ? assignedStudents
    : assignedStudents.slice(0, ASSIGNED_STUDENTS_PREVIEW_LIMIT);

  return (
    <div>
      <PageHeader
        title="Scholarships"
        description="Manage sponsors, grant rules, award amounts, and assigned beneficiaries."
      >
        <div className="flex flex-wrap gap-2">
          <ExportButton
            endpoint="/api/export/scholarships"
            filename="scholarships-report"
            variant="outline"
            className="bg-white/90"
          />
          {canManageScholarships && (
            <Button onClick={openCreateDialog} variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Scholarship
            </Button>
          )}
        </div>
      </PageHeader>

      <FilterCard
        title="Scholarship filters"
        resultLabel={scholarshipResultLabel}
        activeFilters={scholarshipActiveFilters}
        onClear={clearScholarshipFilters}
      >
        <FilterSearchField
          placeholder="Search by name or sponsor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          containerClassName="md:col-span-2"
        />

        <FilterField label="Source">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-10 w-full justify-between bg-white text-sm">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources ({counts.total})</SelectItem>
              {SCHOLARSHIP_SOURCES.map((source) => (
                <SelectItem key={source} value={source}>
                  {SCHOLARSHIP_SOURCE_LABELS[source]}{' '}
                  {source === 'INTERNAL' ? `(${counts.internal})` : `(${counts.external})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </FilterCard>

      <Card className="border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                <CardTitle className="text-foreground">All Scholarships</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  Total: {counts.total}
                </Badge>
                <Badge variant="default" className="text-sm">
                  Internal: {counts.internal}
                </Badge>
                <Badge variant="secondary" className="text-sm">
                  External: {counts.external}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent aria-busy={listLoading}>
          {listLoading ? (
            <ScholarshipTableLoading canManageScholarships={canManageScholarships} />
          ) : scholarships.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No scholarships found</h3>
              <p className="text-muted-foreground">Get started by adding a new scholarship.</p>
              {canManageScholarships && (
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Scholarship
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3 xl:hidden">
                {scholarships.map((scholarship) => {
                  const studentCount = (scholarship as ScholarshipWithCount)._count?.students || 0;

                  return (
                    <div
                      key={scholarship.id}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer rounded-lg border border-slate-200 bg-slate-50/50 p-3 transition-colors hover:border-slate-300 hover:bg-white"
                      onClick={() => handleViewDetails(scholarship.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleViewDetails(scholarship.id);
                        }
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <span
                              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: getScholarshipColor(scholarship.scholarshipName),
                              }}
                            />
                            <h3 className="break-words text-sm font-semibold leading-snug text-slate-950">
                              {scholarship.scholarshipName}
                            </h3>
                          </div>
                          <p className="mt-1 break-words pl-4 text-xs text-slate-600">
                            {scholarship.sponsor}
                          </p>
                        </div>
                        {canManageScholarships && (
                          <div
                            className="flex shrink-0 gap-1"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(scholarship)}
                              className="h-8 w-8 cursor-pointer"
                              aria-label={`Edit ${scholarship.scholarshipName}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteDialog(scholarship)}
                                title="Archive scholarship"
                                className="h-8 w-8 cursor-pointer"
                                aria-label={`Archive ${scholarship.scholarshipName}`}
                              >
                                <Archive className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <ScholarshipFact label="Type">
                          <Badge variant="outline" className={SCHOLARSHIP_BADGE_CLASS}>
                            {scholarship.type}
                          </Badge>
                        </ScholarshipFact>
                        <ScholarshipFact label="Grant">
                          <Badge
                            variant={
                              scholarship.grantType === 'TUITION_ONLY' ? 'outline' : 'default'
                            }
                            className={SCHOLARSHIP_BADGE_CLASS}
                          >
                            {getGrantTypeLabel(scholarship.grantType as GrantType)}
                          </Badge>
                        </ScholarshipFact>
                        <ScholarshipFact label="Terms">
                          <span className="break-words text-xs">
                            {getCoveredTermsLabel(scholarship.coveredTerms)}
                          </span>
                        </ScholarshipFact>
                        <ScholarshipFact label="Source">
                          <Badge
                            variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}
                            className={SCHOLARSHIP_BADGE_CLASS}
                          >
                            {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                          </Badge>
                        </ScholarshipFact>
                        <ScholarshipFact label="Amount">
                          <span className="break-words text-xs font-semibold">
                            {getScholarshipAmountLabel(scholarship)}
                          </span>
                        </ScholarshipFact>
                        <ScholarshipFact label="Students">
                          <span className="text-xs">{getStudentCountLabel(studentCount)}</span>
                        </ScholarshipFact>
                        <ScholarshipFact label="Status">
                          <Badge
                            variant={scholarship.status === 'Active' ? 'default' : 'secondary'}
                            className={SCHOLARSHIP_BADGE_CLASS}
                          >
                            {scholarship.status}
                          </Badge>
                        </ScholarshipFact>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-hidden rounded-lg border border-slate-200 xl:block">
                <Table className="table-fixed text-[12px]">
                  <colgroup>
                    {scholarshipTableColumnWidths.map((width, index) => (
                      <col key={index} style={{ width: `${width}%` }} />
                    ))}
                  </colgroup>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Scholarship</TableHead>
                      <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Sponsor</TableHead>
                      <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Type</TableHead>
                      <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Grant</TableHead>
                      <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Terms</TableHead>
                      <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Source</TableHead>
                      <TableHead className={cn(SCHOLARSHIP_TABLE_HEAD_CLASS, 'text-right')}>
                        Amount
                      </TableHead>
                      <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Students</TableHead>
                      <TableHead className={SCHOLARSHIP_TABLE_HEAD_CLASS}>Status</TableHead>
                      {canManageScholarships && (
                        <TableHead className={cn(SCHOLARSHIP_TABLE_HEAD_CLASS, 'text-right')}>
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scholarships.map((scholarship) => (
                      <TableRow
                        key={scholarship.id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => handleViewDetails(scholarship.id)}
                      >
                        <TableCell className={cn(SCHOLARSHIP_TABLE_CELL_CLASS, 'font-medium')}>
                          <div className="flex min-w-0 items-start gap-2">
                            <span
                              className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{
                                backgroundColor: getScholarshipColor(scholarship.scholarshipName),
                              }}
                            />
                            <span
                              className="min-w-0 break-words text-slate-950"
                              title={scholarship.scholarshipName}
                            >
                              {scholarship.scholarshipName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className={SCHOLARSHIP_TABLE_CELL_CLASS}>
                          <span className="break-words text-slate-600" title={scholarship.sponsor}>
                            {scholarship.sponsor}
                          </span>
                        </TableCell>
                        <TableCell className={SCHOLARSHIP_TABLE_CELL_CLASS}>
                          <Badge variant="outline" className={SCHOLARSHIP_BADGE_CLASS}>
                            {scholarship.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={SCHOLARSHIP_TABLE_CELL_CLASS}>
                          <Badge
                            variant={
                              scholarship.grantType === 'TUITION_ONLY' ? 'outline' : 'default'
                            }
                            className={SCHOLARSHIP_BADGE_CLASS}
                          >
                            {getGrantTypeLabel(scholarship.grantType as GrantType)}
                          </Badge>
                        </TableCell>
                        <TableCell className={SCHOLARSHIP_TABLE_CELL_CLASS}>
                          <Badge variant="outline" className={SCHOLARSHIP_BADGE_CLASS}>
                            {getCoveredTermsLabel(scholarship.coveredTerms)}
                          </Badge>
                        </TableCell>
                        <TableCell className={SCHOLARSHIP_TABLE_CELL_CLASS}>
                          <Badge
                            variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}
                            className={SCHOLARSHIP_BADGE_CLASS}
                          >
                            {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn(SCHOLARSHIP_TABLE_CELL_CLASS, 'text-right')}>
                          <span
                            className={cn(
                              'break-words font-semibold',
                              (scholarship.grantType === 'TUITION_ONLY' ||
                                scholarship.grantType === 'NONE') &&
                                'text-muted-foreground'
                            )}
                          >
                            {getScholarshipAmountLabel(scholarship)}
                          </span>
                        </TableCell>
                        <TableCell className={SCHOLARSHIP_TABLE_CELL_CLASS}>
                          {getStudentCountLabel(
                            (scholarship as ScholarshipWithCount)._count?.students || 0
                          )}
                        </TableCell>
                        <TableCell className={SCHOLARSHIP_TABLE_CELL_CLASS}>
                          <Badge
                            variant={scholarship.status === 'Active' ? 'default' : 'secondary'}
                            className={SCHOLARSHIP_BADGE_CLASS}
                          >
                            {scholarship.status}
                          </Badge>
                        </TableCell>
                        {canManageScholarships && (
                          <TableCell
                            className={cn(SCHOLARSHIP_TABLE_CELL_CLASS, 'text-right')}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(scholarship)}
                                className="h-7 w-7 cursor-pointer zoom-hover"
                                aria-label={`Edit ${scholarship.scholarshipName}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => openDeleteDialog(scholarship)}
                                  title="Archive scholarship"
                                  className="h-7 w-7 cursor-pointer zoom-hover"
                                  aria-label={`Archive ${scholarship.scholarshipName}`}
                                >
                                  <Archive className="h-4 w-4 text-destructive" />
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
            </>
          )}

          {/* Pagination Controls */}
          {showPagination && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages} ({total} total)
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1 || listLoading}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === totalPages || listLoading}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className={FORM_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle>
              {editingScholarship ? 'Edit Scholarship' : 'Create New Scholarship'}
            </DialogTitle>
            <DialogDescription>
              {editingScholarship
                ? 'Update the scholarship information below.'
                : 'Fill in the details to create a new scholarship.'}
            </DialogDescription>
          </DialogHeader>
          <ScholarshipForm
            key={editingScholarship ? `edit-${editingScholarship.id}` : 'create-scholarship'}
            defaultValues={
              editingScholarship ? buildScholarshipFormDefaultValues(editingScholarship) : undefined
            }
            onSubmit={editingScholarship ? handleUpdate : handleCreate}
            onCancel={closeDialog}
            isEditing={!!editingScholarship}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className={COMPACT_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle>Archive Scholarship</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive &quot;{deletingScholarship?.scholarshipName}&quot;?
              {(() => {
                const count = (deletingScholarship as ScholarshipWithCount)?._count?.students;
                return (
                  count !== undefined &&
                  count > 0 && (
                    <span className="block mt-2 text-destructive font-medium">
                      Warning: This scholarship has {count} student(s) assigned to it.
                    </span>
                  )
                );
              })()}
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

      {/* Scholarship Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onOpenChange={(open) => {
          setDetailDialogOpen(open);
          if (!open) {
            setShowAllAssignedStudents(false);
          }
        }}
      >
        <DialogContent className={DETAIL_DIALOG_CONTENT_CLASS}>
          <DialogHeader className={DIALOG_HEADER_CLASS}>
            <DialogTitle>{selectedScholarship && selectedScholarship.scholarshipName}</DialogTitle>
            <DialogDescription>
              Complete scholarship information and assigned students
            </DialogDescription>
          </DialogHeader>
          <div className={DIALOG_BODY_CLASS}>
            {loadingDetail ? (
              <ScholarshipDetailSkeleton />
            ) : selectedScholarship ? (
              <div className="space-y-6">
                {/* Scholarship Information */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Scholarship Details</h3>
                  <Card className="border-2">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Scholarship Name
                          </p>
                          <p className="text-lg font-semibold">
                            {selectedScholarship.scholarshipName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Sponsor</p>
                          <p className="text-lg">{selectedScholarship.sponsor}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Type</p>
                          <Badge variant="outline">{selectedScholarship.type}</Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Source</p>
                          <Badge
                            variant={
                              selectedScholarship.source === 'INTERNAL' ? 'default' : 'secondary'
                            }
                          >
                            {selectedScholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Grant Type</p>
                          <Badge
                            variant={
                              selectedScholarship.grantType === 'TUITION_ONLY'
                                ? 'outline'
                                : 'default'
                            }
                          >
                            {selectedScholarship.grantType === 'TUITION_ONLY'
                              ? 'Free Tuition'
                              : selectedScholarship.grantType === 'FULL'
                                ? 'Full Grant'
                                : selectedScholarship.grantType === 'NONE'
                                  ? 'None'
                                  : selectedScholarship.grantType.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Covered Terms</p>
                          <Badge variant="outline">
                            {getCoveredTermsLabel(selectedScholarship.coveredTerms)}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Amount</p>
                          <p className="text-2xl font-bold text-primary">
                            {selectedScholarship.grantType === 'TUITION_ONLY' ||
                            selectedScholarship.grantType === 'NONE' ? (
                              <span className="text-lg">Free Tuition</span>
                            ) : (
                              formatCurrency(selectedScholarship.amount)
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            Amount Subsidy
                          </p>
                          <p className="text-lg font-semibold">
                            {formatCurrency(selectedScholarship.amountSubsidy)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">% Subsidy</p>
                          <p className="text-lg font-semibold">
                            {Number(selectedScholarship.percentSubsidy || 0).toFixed(2)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <Badge
                            variant={
                              selectedScholarship.status === 'Active' ? 'default' : 'secondary'
                            }
                          >
                            {selectedScholarship.status}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">
                            FSE (Total % Subsidy)
                          </p>
                          <p className="text-2xl font-bold text-primary">
                            {selectedScholarship.students && selectedScholarship.students.length > 0
                              ? `${selectedScholarship.students
                                  .reduce((total, ss) => {
                                    const studentFees = ss.student.fees;
                                    if (!studentFees || studentFees.length === 0) return total;
                                    const studentPercentSubsidy = studentFees.reduce(
                                      (sum, fee: { percentSubsidy: number | string }) =>
                                        sum + Number(fee.percentSubsidy),
                                      0
                                    );
                                    return total + studentPercentSubsidy;
                                  }, 0)
                                  .toFixed(2)}%`
                              : '0.00%'}
                          </p>
                        </div>
                        {(selectedScholarship.grantType === 'TUITION_ONLY' ||
                          selectedScholarship.grantType === 'MISC_ONLY' ||
                          selectedScholarship.grantType === 'LAB_ONLY') && (
                          <div className="col-span-2">
                            <p className="text-sm font-medium text-muted-foreground mb-2">Covers</p>
                            <div className="flex gap-2">
                              {selectedScholarship.coversTuition && (
                                <Badge variant="default">Tuition</Badge>
                              )}
                              {selectedScholarship.coversMiscellaneous && (
                                <Badge variant="secondary">Miscellaneous</Badge>
                              )}
                              {selectedScholarship.coversLaboratory && (
                                <Badge variant="outline">Laboratory</Badge>
                              )}
                              {selectedScholarship.coversOther && (
                                <Badge variant="outline">
                                  {selectedScholarship.otherFeeName || 'Other'}
                                </Badge>
                              )}
                              {!selectedScholarship.coversTuition &&
                                !selectedScholarship.coversMiscellaneous &&
                                !selectedScholarship.coversLaboratory &&
                                !selectedScholarship.coversOther && (
                                  <span className="text-sm text-muted-foreground">
                                    No specific fees selected
                                  </span>
                                )}
                            </div>
                          </div>
                        )}
                        {selectedScholarship.requirements && (
                          <div className="col-span-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Requirements
                            </p>
                            <p className="text-sm mt-1 p-3 bg-muted/50 rounded-lg whitespace-pre-wrap">
                              {selectedScholarship.requirements}
                            </p>
                          </div>
                        )}
                        {/* Fee Amounts Section */}
                        {(selectedScholarship.coversTuition ||
                          selectedScholarship.coversMiscellaneous ||
                          selectedScholarship.coversLaboratory ||
                          selectedScholarship.coversOther) && (
                          <div className="col-span-2">
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                              Fee Amounts
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              {selectedScholarship.coversTuition && (
                                <div className="p-3 bg-muted/50 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Tuition Fee</p>
                                  <p className="text-lg font-semibold text-primary">
                                    {formatCurrency(selectedScholarship.tuitionFee)}
                                  </p>
                                </div>
                              )}
                              {selectedScholarship.coversMiscellaneous && (
                                <div className="p-3 bg-muted/50 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Miscellaneous Fee</p>
                                  <p className="text-lg font-semibold text-primary">
                                    {formatCurrency(selectedScholarship.miscellaneousFee)}
                                  </p>
                                </div>
                              )}
                              {selectedScholarship.coversLaboratory && (
                                <div className="p-3 bg-muted/50 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Laboratory Fee</p>
                                  <p className="text-lg font-semibold text-primary">
                                    {formatCurrency(selectedScholarship.laboratoryFee)}
                                  </p>
                                </div>
                              )}
                              {selectedScholarship.coversOther && (
                                <div className="p-3 bg-muted/50 rounded-lg">
                                  <p className="text-xs text-muted-foreground">
                                    {selectedScholarship.otherFeeName || 'Other'} Fee
                                  </p>
                                  <p className="text-lg font-semibold text-primary">
                                    {formatCurrency(selectedScholarship.otherFee)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Assigned Students Section */}
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Assigned Students</h3>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {hiddenAssignedStudentCount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Showing {visibleAssignedStudents.length} of {assignedStudentCount}
                        </span>
                      )}
                      <Badge variant="outline" className="text-sm">
                        {assignedStudentCount} students
                      </Badge>
                    </div>
                  </div>
                  {assignedStudentCount > 0 ? (
                    <div className="space-y-3">
                      {visibleAssignedStudents.map((ss) => (
                        <Card key={ss.id} className="border">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                <div>
                                  <h4 className="text-lg font-semibold">
                                    {ss.student.lastName}, {ss.student.firstName}{' '}
                                    {ss.student.middleInitial || ''}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {ss.student.program}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline">
                                  {
                                    GRADE_LEVEL_LABELS[
                                      ss.student.gradeLevel as keyof typeof GRADE_LEVEL_LABELS
                                    ]
                                  }
                                </Badge>
                                <Badge
                                  variant={ss.student.status === 'Active' ? 'default' : 'secondary'}
                                >
                                  {ss.student.status}
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Grant Amount</p>
                                <p className="font-semibold">{formatCurrency(ss.grantAmount)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Award Date</p>
                                <p>{new Date(ss.awardDate).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Term Period</p>
                                <p>N/A</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Status</p>
                                <Badge
                                  variant={
                                    ss.scholarshipStatus === 'Active' ? 'default' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {ss.scholarshipStatus}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {hiddenAssignedStudentCount > 0 && (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-600">
                              {showAllAssignedStudents
                                ? 'Full assigned student list is visible.'
                                : `${hiddenAssignedStudentCount} more assigned ${
                                    hiddenAssignedStudentCount === 1 ? 'student' : 'students'
                                  } hidden to keep this modal compact.`}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="shrink-0 bg-white"
                              onClick={() => setShowAllAssignedStudents((current) => !current)}
                            >
                              {showAllAssignedStudents ? (
                                <>
                                  <ChevronUp className="mr-2 h-4 w-4" />
                                  Show less
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="mr-2 h-4 w-4" />
                                  Show all students
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                      <div className="mt-4 p-4 bg-primary/10 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground">
                          Total Grants Awarded
                        </p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(
                            selectedScholarship.students.reduce(
                              (sum, ss) => sum + Number(ss.grantAmount),
                              0
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="mx-auto h-12 w-12 mb-2 opacity-50" />
                      <p>No students assigned to this scholarship yet</p>
                    </div>
                  )}
                </div>
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
