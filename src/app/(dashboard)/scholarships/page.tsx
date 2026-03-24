'use client';

import { useEffect, useState } from 'react';

import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';

import { useAuth } from '@/components/auth/auth-provider';
import { ScholarshipForm } from '@/components/forms';
import { PageHeader } from '@/components/layout';
import { ExportButton } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCreateScholarship,
  useDeleteScholarship,
  useScholarship,
  useScholarshipFilterOptions,
  useScholarships,
  useUpdateScholarship,
} from '@/hooks/use-queries';
import { formatCurrency } from '@/lib/utils';
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

export default function ScholarshipsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [scholarships, setScholarships] = useState<ScholarshipWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [search, setSearch] = useState('');
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

  // TanStack Query hooks for data fetching
  const { data: scholarshipsData, isLoading: scholarshipsLoading } = useScholarships({
    search,
    source: sourceFilter === 'all' ? undefined : sourceFilter,
    page,
    limit: 10,
  });

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
    setLoading(scholarshipsLoading);
    if (!scholarshipsLoading) {
      setIsVisible(true);
    }
  }, [scholarshipsLoading]);

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
  }, [sourceFilter, search]);

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
    // useScholarship hook will fetch automatically due to enabled: !!selectedScholarship?.id
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <PageHeader title="Scholarships" description="Manage scholarship programs and grants">
        <div className="flex gap-2">
          <ExportButton endpoint="/api/export/scholarships" filename="scholarships-report" />
          {isAdmin && (
            <Button onClick={openCreateDialog} variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Scholarship
            </Button>
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
                placeholder="Search by name or sponsor..."
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
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-8 w-[220px] text-xs">
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

                {/* Clear Filters Button */}
                {(sourceFilter !== 'all' || search) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setSourceFilter('all');
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
        <CardContent>
          {scholarships.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No scholarships found</h3>
              <p className="text-muted-foreground">Get started by adding a new scholarship.</p>
              {isAdmin && (
                <Button className="mt-4" onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Scholarship
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scholarship Name</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Grant Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scholarships.map((scholarship) => (
                    <TableRow
                      key={scholarship.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(scholarship.id)}
                    >
                      <TableCell className="font-medium">
                        <Badge
                          variant="outline"
                          style={{
                            backgroundColor: getScholarshipColor(scholarship.scholarshipName),
                            color: '#374151',
                            borderColor: getScholarshipColor(scholarship.scholarshipName),
                          }}
                        >
                          {scholarship.scholarshipName}
                        </Badge>
                      </TableCell>
                      <TableCell>{scholarship.sponsor}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{scholarship.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={scholarship.grantType === 'TUITION_ONLY' ? 'outline' : 'default'}
                        >
                          {scholarship.grantType === 'TUITION_ONLY'
                            ? 'Free Tuition'
                            : scholarship.grantType === 'FULL'
                              ? 'Full Grant'
                              : scholarship.grantType === 'NONE'
                                ? 'None'
                                : scholarship.grantType.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}
                        >
                          {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {scholarship.grantType === 'TUITION_ONLY' ||
                        scholarship.grantType === 'NONE' ? (
                          <span className="text-muted-foreground">Free Tuition</span>
                        ) : (
                          formatCurrency(scholarship.amount)
                        )}
                      </TableCell>
                      <TableCell>
                        {(scholarship as ScholarshipWithCount)._count?.students || 0} students
                      </TableCell>
                      <TableCell>
                        <Badge variant={scholarship.status === 'Active' ? 'default' : 'secondary'}>
                          {scholarship.status}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(scholarship)}
                              className="cursor-pointer zoom-hover"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(scholarship)}
                              title="Archive scholarship"
                              className="cursor-pointer zoom-hover"
                            >
                              <Archive className="h-4 w-4 text-destructive" />
                            </Button>
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
          {scholarships.length > 0 && (
            <div className="mt-4 flex items-center justify-between border-t pt-4">
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

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
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
            defaultValues={
              editingScholarship
                ? {
                    scholarshipName: editingScholarship.scholarshipName,
                    sponsor: editingScholarship.sponsor,
                    type: editingScholarship.type,
                    source: editingScholarship.source,
                    eligibleGradeLevels: editingScholarship.eligibleGradeLevels || '',
                    eligiblePrograms: editingScholarship.eligiblePrograms || '',
                    amount: editingScholarship.amount,
                    amountSubsidy: editingScholarship.amountSubsidy,
                    percentSubsidy: editingScholarship.percentSubsidy,
                    requirements: editingScholarship.requirements || '',
                    status: editingScholarship.status,
                    grantType: editingScholarship.grantType as GrantType,
                    coversTuition: editingScholarship.coversTuition,
                    coversMiscellaneous: editingScholarship.coversMiscellaneous,
                    coversLaboratory: editingScholarship.coversLaboratory,
                    coversOther: editingScholarship.coversOther,
                    otherFeeName: editingScholarship.otherFeeName || undefined,
                    tuitionFee: editingScholarship.tuitionFee,
                    miscellaneousFee: editingScholarship.miscellaneousFee,
                    laboratoryFee: editingScholarship.laboratoryFee,
                    otherFee: editingScholarship.otherFee,
                  }
                : undefined
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
        <DialogContent>
          <DialogHeader>
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
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={closeDeleteDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {submitting ? 'Archiving...' : 'Archive'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Scholarship Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedScholarship && selectedScholarship.scholarshipName}</DialogTitle>
            <DialogDescription>
              Complete scholarship information and assigned students
            </DialogDescription>
          </DialogHeader>
          {loadingDetail ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
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
                            selectedScholarship.grantType === 'TUITION_ONLY' ? 'outline' : 'default'
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
                        <p className="text-sm font-medium text-muted-foreground">Amount Subsidy</p>
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
                          EFC (Total % Subsidy)
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
                          <p className="text-sm font-medium text-muted-foreground">Requirements</p>
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
                  <Badge variant="outline" className="text-sm">
                    {selectedScholarship.students?.length || 0} students
                  </Badge>
                </div>
                {selectedScholarship.students && selectedScholarship.students.length > 0 ? (
                  <div className="space-y-3">
                    {selectedScholarship.students.map((ss) => (
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
                              <p>
                                {ss.startTerm} - {ss.endTerm}
                              </p>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
