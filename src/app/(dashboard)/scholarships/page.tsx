'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
 Dialog,
 DialogContent,
 DialogDescription,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Archive, GraduationCap, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { ScholarshipForm } from '@/components/forms';
import { ExportButton } from '@/components/shared';
import type { CreateScholarshipInput, GrantType } from '@/types';
import { useAuth } from '@/components/auth/auth-provider';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS, GRADE_LEVEL_LABELS } from '@/types';
import { clientCache } from '@/lib/cache';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';

interface Scholarship {
 id: number;
 scholarshipName: string;
 sponsor: string;
 type: string;
 source: string;
 amount: number;
 requirements: string | null;
 status: string;
 grantType: string;
 coversTuition: boolean;
 coversMiscellaneous: boolean;
 coversLaboratory: boolean;
 _count?: {
 students: number;
 };
}

interface ScholarshipDetail extends Scholarship {
 students: Array<{
 id: number;
 studentId: number;
 awardDate: string;
 startTerm: string;
 endTerm: string;
 grantAmount: number;
 grantType: string;
 scholarshipStatus: string;
 student: {
 firstName: string;
 lastName: string;
 middleInitial: string | null;
 program: string;
 gradeLevel: string;
 yearLevel: string;
 status: string;
 };
 }>;
}

interface ScholarshipCounts {
 total: number;
 internal: number;
 external: number;
}

export default function ScholarshipsPage() {
 const { user } = useAuth();
 const isAdmin = user?.role === 'ADMIN';
 const [scholarships, setScholarships] = useState<Scholarship[]>([]);
 const [loading, setLoading] = useState(true);
 const [isVisible, setIsVisible] = useState(false);
 const [sourceFilter, setSourceFilter] = useState<string>('all');
 const [dialogOpen, setDialogOpen] = useState(false);
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
 const [deletingScholarship, setDeletingScholarship] = useState<Scholarship | null>(null);
 const [submitting, setSubmitting] = useState(false);
 const [counts, setCounts] = useState<ScholarshipCounts>({ total: 0, internal: 0, external: 0 });
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [total, setTotal] = useState(0);
 const [detailDialogOpen, setDetailDialogOpen] = useState(false);
 const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipDetail | null>(null);
 const [loadingDetail, setLoadingDetail] = useState(false);

 const fetchCounts = useCallback(async () => {
 try {
 const res = await fetch('/api/scholarships?action=counts');
 const data = await res.json();
 if (data.success) {
 setCounts(data.data);
 }
 } catch (error) {
 console.error('Error fetching scholarship counts:', error);
 }
 }, []);

 const fetchScholarships = useCallback(async () => {
 try {
 const params = new URLSearchParams();
 params.append('limit', '10');
 params.append('page', page.toString());
 if (sourceFilter && sourceFilter !== 'all') {
 params.append('source', sourceFilter);
 }
 const res = await fetch(`/api/scholarships?${params}`);
 const data = await res.json();

 if (data.success) {
 setScholarships(data.data);
 setTotal(data.total);
 setTotalPages(data.totalPages);
 }
 } catch (error) {
 console.error('Error fetching scholarships:', error);
 toast.error('Failed to load scholarships');
 } finally {
 setLoading(false);
 setIsVisible(true);
 }
 }, [sourceFilter, page]);

 useEffect(() => {
 fetchCounts();
 fetchScholarships();
 }, [fetchScholarships, fetchCounts]);

 useEffect(() => {
 // Reset to page 1 when filter changes
 setPage(1);
 }, [sourceFilter]);

 const handleCreate = async (data: CreateScholarshipInput) => {
 setSubmitting(true);
 try {
 const res = await fetch('/api/scholarships', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(data),
 });
 const result = await res.json();

 if (result.success) {
 toast.success('Scholarship created successfully');
 setDialogOpen(false);
 // Add the new scholarship to the list instantly
 setScholarships(prev => [result.data, ...prev]);
 // Invalidate cache
 clientCache.invalidatePattern('/api/scholarships');
 clientCache.invalidatePattern('/api/dashboard');
 // Clear sessionStorage to force dashboard refresh
 sessionStorage.removeItem('dashboardData');
 sessionStorage.removeItem('detailedStudents');
 // Trigger dashboard refresh event
 window.dispatchEvent(new Event('refreshDashboard'));
 fetchCounts();
 // Don't refetch - optimistic update already applied
 } else {
 toast.error(result.error || 'Failed to create scholarship');
 }
 } catch (error) {
 console.error('Error creating scholarship:', error);
 toast.error('Failed to create scholarship');
 } finally {
 setSubmitting(false);
 }
 };

 const handleUpdate = async (data: CreateScholarshipInput) => {
 if (!editingScholarship) return;

 setSubmitting(true);

 // Optimistically update the list for instant UI feedback
 const updatedScholarship = { ...editingScholarship, ...data };
 setScholarships(prev => prev.map(s => s.id === editingScholarship.id ? updatedScholarship : s));
 setDialogOpen(false);
 setEditingScholarship(null);

 try {
 const res = await fetch(`/api/scholarships/${editingScholarship.id}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(data),
 });
 const result = await res.json();

 if (result.success) {
 toast.success('Scholarship updated successfully');
 // Update with the server response to ensure consistency
 setScholarships(prev => prev.map(s => s.id === editingScholarship.id ? result.data : s));
 // Invalidate cache
 clientCache.invalidatePattern('/api/scholarships');
 clientCache.invalidatePattern('/api/dashboard');
 // Clear sessionStorage to force dashboard refresh
 sessionStorage.removeItem('dashboardData');
 sessionStorage.removeItem('detailedStudents');
 // Trigger dashboard refresh event
 window.dispatchEvent(new Event('refreshDashboard'));
 fetchCounts();
 // Don't refetch scholarships to avoid stale cache - optimistic update is already applied
 } else {
 toast.error(result.error || 'Failed to update scholarship');
 // Revert optimistic update on failure
 fetchScholarships();
 }
 } catch (error) {
 console.error('Error updating scholarship:', error);
 toast.error('Failed to update scholarship');
 // Revert optimistic update on error
 fetchScholarships();
 } finally {
 setSubmitting(false);
 }
 };

  const handleDelete = async () => {
    if (!deletingScholarship) return;

    setSubmitting(true);

    // Optimistically remove scholarship from list for instant UI update
    const scholarshipId = deletingScholarship.id;
    setScholarships(prev => prev.filter(s => s.id !== scholarshipId));
    setDeleteDialogOpen(false);
    setDeletingScholarship(null);

    try {
      const res = await fetch(`/api/scholarships/${scholarshipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      });
      const result = await res.json();

      if (result.success) {
        toast.success('Scholarship archived successfully');
        // Invalidate cache
        clientCache.invalidatePattern('/api/scholarships');
        clientCache.invalidatePattern('/api/dashboard');
        // Clear sessionStorage to force dashboard refresh
        sessionStorage.removeItem('dashboardData');
        sessionStorage.removeItem('detailedStudents');
        // Trigger dashboard refresh event
        window.dispatchEvent(new Event('refreshDashboard'));
        fetchCounts();
        // Don't refetch - optimistic update already applied
      } else {
        toast.error(result.error || 'Failed to archive scholarship');
        // Revert optimistic update on failure
        fetchScholarships();
      }
    } catch (error) {
      console.error('Error archiving scholarship:', error);
      toast.error('Failed to archive scholarship');
      // Revert optimistic update on error
      fetchScholarships();
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

 const handleViewDetails = async (scholarshipId: number) => {
 setLoadingDetail(true);
 setDetailDialogOpen(true);
 try {
 const res = await fetch(`/api/scholarships/${scholarshipId}`);
 const json = await res.json();
 if (json.success) {
 setSelectedScholarship(json.data);
 } else {
 toast.error('Failed to load scholarship details');
 }
 } catch (error) {
 console.error('Error fetching scholarship details:', error);
 toast.error('Failed to load scholarship details');
 } finally {
 setLoadingDetail(false);
 }
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
 <PageHeader
 title="Scholarships"
 description="Manage scholarship programs and grants"
 >
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
 <Select value={sourceFilter} onValueChange={setSourceFilter}>
 <SelectTrigger className="w-[220px]">
 <SelectValue placeholder="Filter by source" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Sources ({counts.total})</SelectItem>
 {SCHOLARSHIP_SOURCES.map((source) => (
 <SelectItem key={source} value={source}>
 {SCHOLARSHIP_SOURCE_LABELS[source]} {source === 'INTERNAL' ? `(${counts.internal})` : `(${counts.external})`}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
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
 {scholarship.scholarshipName}
 </TableCell>
 <TableCell>{scholarship.sponsor}</TableCell>
 <TableCell>
 <Badge variant="outline">{scholarship.type}</Badge>
 </TableCell>
 <TableCell>
 <Badge variant={scholarship.grantType === 'TUITION_ONLY' ? 'outline' : 'default'}>
 {scholarship.grantType === 'TUITION_ONLY' ? 'Free Tuition' : 
  scholarship.grantType === 'FULL' ? 'Full Grant' :
  scholarship.grantType === 'NONE' ? 'None' :
  scholarship.grantType.replace('_', ' ')}
 </Badge>
 </TableCell>
 <TableCell>
 <Badge variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}>
 {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
 </Badge>
 </TableCell>
 <TableCell className="text-right font-semibold">
 {scholarship.grantType === 'TUITION_ONLY' || scholarship.grantType === 'NONE' ? (
 <span className="text-muted-foreground">Free Tuition</span>
 ) : (
 formatCurrency(scholarship.amount)
 )}
 </TableCell>
 <TableCell>
 {scholarship._count?.students || 0} students
 </TableCell>
 <TableCell>
 <Badge
 variant={
 scholarship.status === 'Active' ? 'default' : 'secondary'
 }
 >
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
 onClick={() => setPage(p => p - 1)}
 disabled={page === 1}
 >
 <ChevronLeft className="h-4 w-4 mr-1" />
 Previous
 </Button>
 <Button
 variant="outline"
 size="sm"
 onClick={() => setPage(p => p + 1)}
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
 defaultValues={editingScholarship ? {
 scholarshipName: editingScholarship.scholarshipName,
 sponsor: editingScholarship.sponsor,
 type: editingScholarship.type,
 source: editingScholarship.source,
 amount: editingScholarship.amount,
 requirements: editingScholarship.requirements || '',
 status: editingScholarship.status,
 grantType: editingScholarship.grantType as GrantType,
 coversTuition: editingScholarship.coversTuition,
 coversMiscellaneous: editingScholarship.coversMiscellaneous,
 coversLaboratory: editingScholarship.coversLaboratory,
 } : undefined}
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
  {deletingScholarship?._count?.students && deletingScholarship._count.students > 0 && (
  <span className="block mt-2 text-destructive font-medium">
  Warning: This scholarship has {deletingScholarship._count.students} student(s) assigned to it.
  </span>
  )}
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
 <DialogTitle>
 {selectedScholarship && selectedScholarship.scholarshipName}
 </DialogTitle>
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
 <p className="text-sm font-medium text-muted-foreground">Scholarship Name</p>
 <p className="text-lg font-semibold">{selectedScholarship.scholarshipName}</p>
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
 <Badge variant={selectedScholarship.source === 'INTERNAL' ? 'default' : 'secondary'}>
 {selectedScholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
 </Badge>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground">Grant Type</p>
 <Badge variant={selectedScholarship.grantType === 'TUITION_ONLY' ? 'outline' : 'default'}>
 {selectedScholarship.grantType === 'TUITION_ONLY' ? 'Free Tuition' : 
  selectedScholarship.grantType === 'FULL' ? 'Full Grant' :
  selectedScholarship.grantType === 'NONE' ? 'None' :
  selectedScholarship.grantType.replace('_', ' ')}
 </Badge>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground">Amount</p>
 <p className="text-2xl font-bold text-primary">
 {selectedScholarship.grantType === 'TUITION_ONLY' || selectedScholarship.grantType === 'NONE' ? (
 <span className="text-lg">Free Tuition</span>
 ) : (
 formatCurrency(selectedScholarship.amount)
 )}
 </p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground">Status</p>
 <Badge variant={selectedScholarship.status === 'Active' ? 'default' : 'secondary'}>
 {selectedScholarship.status}
 </Badge>
 </div>
 {(selectedScholarship.grantType === 'TUITION_ONLY' || selectedScholarship.grantType === 'MISC_ONLY' || selectedScholarship.grantType === 'LAB_ONLY') && (
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
 {!selectedScholarship.coversTuition && !selectedScholarship.coversMiscellaneous && !selectedScholarship.coversLaboratory && (
 <span className="text-sm text-muted-foreground">No specific fees selected</span>
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
 {ss.student.lastName}, {ss.student.firstName} {ss.student.middleInitial || ''}
 </h4>
 <p className="text-sm text-muted-foreground">{ss.student.program}</p>
 </div>
 </div>
 <div className="flex gap-2">
 <Badge variant="outline">
 {GRADE_LEVEL_LABELS[ss.student.gradeLevel as keyof typeof GRADE_LEVEL_LABELS]}
 </Badge>
 <Badge variant={ss.student.status === 'Active' ? 'default' : 'secondary'}>
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
 <p>{ss.startTerm} - {ss.endTerm}</p>
 </div>
 <div>
 <p className="text-muted-foreground">Status</p>
 <Badge variant={ss.scholarshipStatus === 'Active' ? 'default' : 'secondary'} className="text-xs">
 {ss.scholarshipStatus}
 </Badge>
 </div>
 </div>
 </CardContent>
 </Card>
 ))}
 <div className="mt-4 p-4 bg-primary/10 rounded-lg">
 <p className="text-sm font-medium text-muted-foreground">Total Grants Awarded</p>
 <p className="text-2xl font-bold">
 {formatCurrency(selectedScholarship.students.reduce((sum, ss) => sum + Number(ss.grantAmount), 0))}
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
