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
import { Plus, Pencil, Trash2, GraduationCap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { ScholarshipForm } from '@/components/forms';
import { ExportButton } from '@/components/shared';
import type { CreateScholarshipInput } from '@/types';
import { useAuth } from '@/components/auth/auth-provider';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS } from '@/types';
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from '@/components/ui/select';
import { fetchWithCache, clientCache } from '@/lib/cache';

interface Scholarship {
 id: number;
 scholarshipName: string;
 sponsor: string;
 type: string;
 source: string;
 amount: number;
 requirements: string | null;
 status: string;
 _count?: {
 students: number;
 };
}

export default function ScholarshipsPage() {
 const { user } = useAuth();
 const isAdmin = user?.role === 'ADMIN';
 const [scholarships, setScholarships] = useState<Scholarship[]>([]);
 const [loading, setLoading] = useState(true);
 const [sourceFilter, setSourceFilter] = useState<string>('all');
 const [dialogOpen, setDialogOpen] = useState(false);
 const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
 const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
 const [deletingScholarship, setDeletingScholarship] = useState<Scholarship | null>(null);
 const [submitting, setSubmitting] = useState(false);

 const fetchScholarships = useCallback(async () => {
 try {
 const params = new URLSearchParams();
 if (sourceFilter && sourceFilter !== 'all') {
 params.append('source', sourceFilter);
 }
 
 const url = `/api/scholarships?${params}`;
 const data = await fetchWithCache<{ success: boolean; data: Scholarship[] }>(
 url,
 undefined,
 5 * 60 * 1000 // 5 minutes cache
 );
 
 if (data.success) {
 setScholarships(data.data);
 }
 } catch (error) {
 console.error('Error fetching scholarships:', error);
 toast.error('Failed to load scholarships');
 } finally {
 setLoading(false);
 }
 }, [sourceFilter]);

 useEffect(() => {
 fetchScholarships();
 }, [fetchScholarships]);

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
 // Invalidate cache
 clientCache.invalidatePattern('/api/scholarships');
 clientCache.invalidatePattern('/api/dashboard');
 fetchScholarships();
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
 try {
 const res = await fetch(`/api/scholarships/${editingScholarship.id}`, {
 method: 'PUT',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify(data),
 });
 const result = await res.json();
 
 if (result.success) {
 toast.success('Scholarship updated successfully');
 setDialogOpen(false);
 setEditingScholarship(null);
 // Invalidate cache
 clientCache.invalidatePattern('/api/scholarships');
 clientCache.invalidatePattern('/api/dashboard');
 fetchScholarships();
 } else {
 toast.error(result.error || 'Failed to update scholarship');
 }
 } catch (error) {
 console.error('Error updating scholarship:', error);
 toast.error('Failed to update scholarship');
 } finally {
 setSubmitting(false);
 }
 };

 const handleDelete = async () => {
 if (!deletingScholarship) return;
 
 setSubmitting(true);
 try {
 const res = await fetch(`/api/scholarships/${deletingScholarship.id}`, {
 method: 'DELETE',
 });
 const result = await res.json();
 
 if (result.success) {
 toast.success('Scholarship deleted successfully');
 setDeleteDialogOpen(false);
 setDeletingScholarship(null);
 // Invalidate cache
 clientCache.invalidatePattern('/api/scholarships');
 clientCache.invalidatePattern('/api/dashboard');
 fetchScholarships();
 } else {
 toast.error(result.error || 'Failed to delete scholarship');
 }
 } catch (error) {
 console.error('Error deleting scholarship:', error);
 toast.error('Failed to delete scholarship');
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

 if (loading) {
 return (
 <div className="flex h-[50vh] items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
 </div>
 );
 }

 return (
 <div>
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
 <CardTitle className="flex items-center gap-2 text-foreground">
 <GraduationCap className="h-5 w-5" />
 All Scholarships
 </CardTitle>
 <Select value={sourceFilter} onValueChange={setSourceFilter}>
 <SelectTrigger className="w-[220px]">
 <SelectValue placeholder="Filter by source" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Sources</SelectItem>
 {SCHOLARSHIP_SOURCES.map((source) => (
 <SelectItem key={source} value={source}>
 {SCHOLARSHIP_SOURCE_LABELS[source]}
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
 <TableHead>Source</TableHead>
 <TableHead className="text-right">Amount</TableHead>
 <TableHead>Students</TableHead>
 <TableHead>Status</TableHead>
 {isAdmin && <TableHead className="text-right">Actions</TableHead>}
 </TableRow>
 </TableHeader>
 <TableBody>
 {scholarships.map((scholarship) => (
 <TableRow key={scholarship.id}>
 <TableCell className="font-medium">
 {scholarship.scholarshipName}
 </TableCell>
 <TableCell>{scholarship.sponsor}</TableCell>
 <TableCell>
 <Badge variant="outline">{scholarship.type}</Badge>
 </TableCell>
 <TableCell>
 <Badge variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}>
 {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
 </Badge>
 </TableCell>
 <TableCell className="text-right font-semibold">
 {formatCurrency(scholarship.amount)}
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
 <TableCell className="text-right">
 <div className="flex justify-end gap-2">
 <Button 
 variant="ghost" 
 size="icon"
 onClick={() => openEditDialog(scholarship)}
 >
 <Pencil className="h-4 w-4" />
 </Button>
 <Button 
 variant="ghost" 
 size="icon"
 onClick={() => openDeleteDialog(scholarship)}
 >
 <Trash2 className="h-4 w-4 text-destructive" />
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
 <DialogTitle>Delete Scholarship</DialogTitle>
 <DialogDescription>
 Are you sure you want to delete &quot;{deletingScholarship?.scholarshipName}&quot;?
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
 <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
 {submitting ? 'Deleting...' : 'Delete'}
 </Button>
 </div>
 </DialogContent>
 </Dialog>
 </div>
 );
}
