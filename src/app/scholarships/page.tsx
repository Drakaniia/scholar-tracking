'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { SCHOLARSHIP_TYPES, CreateScholarshipInput } from '@/types';

interface Scholarship {
    id: number;
    scholarshipName: string;
    sponsor: string;
    type: string;
    amount: number;
    requirements: string | null;
    status: string;
    _count: {
        applications: number;
    };
}

const SCHOLARSHIP_STATUSES = ['Active', 'Inactive', 'Closed'] as const;

export default function ScholarshipsPage() {
    const [scholarships, setScholarships] = useState<Scholarship[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingScholarship, setEditingScholarship] = useState<Scholarship | null>(null);
    const [formData, setFormData] = useState<CreateScholarshipInput>({
        scholarshipName: '',
        sponsor: '',
        type: 'Internal',
        amount: 0,
        requirements: '',
        status: 'Active',
    });

    const fetchScholarships = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('limit', '100');

            const res = await fetch(`/api/scholarships?${params}`);
            const json = await res.json();
            if (json.success) {
                setScholarships(json.data);
            }
        } catch (error) {
            console.error('Error fetching scholarships:', error);
            toast.error('Failed to fetch scholarships');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        fetchScholarships();
    }, [search, fetchScholarships]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingScholarship
                ? `/api/scholarships/${editingScholarship.id}`
                : '/api/scholarships';
            const method = editingScholarship ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (json.success) {
                toast.success(
                    editingScholarship
                        ? 'Scholarship updated successfully'
                        : 'Scholarship created successfully'
                );
                setDialogOpen(false);
                setEditingScholarship(null);
                resetForm();
                fetchScholarships();
            } else {
                toast.error(json.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving scholarship:', error);
            toast.error('Failed to save scholarship');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this scholarship?')) return;

        try {
            const res = await fetch(`/api/scholarships/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                toast.success('Scholarship deleted successfully');
                fetchScholarships();
            } else {
                toast.error(json.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting scholarship:', error);
            toast.error('Failed to delete scholarship');
        }
    };

    const handleEdit = (scholarship: Scholarship) => {
        setEditingScholarship(scholarship);
        setFormData({
            scholarshipName: scholarship.scholarshipName,
            sponsor: scholarship.sponsor,
            type: scholarship.type,
            amount: Number(scholarship.amount),
            requirements: scholarship.requirements || '',
            status: scholarship.status,
        });
        setDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            scholarshipName: '',
            sponsor: '',
            type: 'Internal',
            amount: 0,
            requirements: '',
            status: 'Active',
        });
        setEditingScholarship(null);
    };

    const internalScholarships = scholarships.filter((s) => s.type === 'Internal');
    const externalScholarships = scholarships.filter((s) => s.type === 'External');

    const ScholarshipTable = ({ data }: { data: Scholarship[] }) => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applications</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                            No scholarships found
                        </TableCell>
                    </TableRow>
                ) : (
                    data.map((scholarship) => (
                        <TableRow key={scholarship.id}>
                            <TableCell className="font-medium">
                                {scholarship.scholarshipName}
                            </TableCell>
                            <TableCell>{scholarship.sponsor}</TableCell>
                            <TableCell>{formatCurrency(Number(scholarship.amount))}</TableCell>
                            <TableCell>
                                <Badge
                                    variant={scholarship.status === 'Active' ? 'default' : 'secondary'}
                                    className={
                                        scholarship.status === 'Active'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                            : ''
                                    }
                                >
                                    {scholarship.status}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant="outline">{scholarship._count.applications}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(scholarship)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(scholarship.id)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    );

    return (
        <div>
            <PageHeader title="Scholarships" description="Manage scholarship programs">
                <Dialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (!open) resetForm();
                    }}
                >
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Scholarship
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingScholarship ? 'Edit Scholarship' : 'Add New Scholarship'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingScholarship
                                    ? 'Update scholarship information'
                                    : 'Create a new scholarship program'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="scholarshipName">Scholarship Name</Label>
                                <Input
                                    id="scholarshipName"
                                    value={formData.scholarshipName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, scholarshipName: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sponsor">Sponsor</Label>
                                <Input
                                    id="sponsor"
                                    value={formData.sponsor}
                                    onChange={(e) =>
                                        setFormData({ ...formData, sponsor: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Type</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, type: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SCHOLARSHIP_TYPES.map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {type}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status</Label>
                                    <Select
                                        value={formData.status}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, status: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {SCHOLARSHIP_STATUSES.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount (₱)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            amount: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="requirements">Requirements</Label>
                                <Textarea
                                    id="requirements"
                                    value={formData.requirements || ''}
                                    onChange={(e) =>
                                        setFormData({ ...formData, requirements: e.target.value })
                                    }
                                    rows={3}
                                />
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    {editingScholarship ? 'Update' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search scholarships..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Scholarships Tabs */}
            {loading ? (
                <div className="flex h-48 items-center justify-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                </div>
            ) : (
                <Tabs defaultValue="internal" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="internal">
                            Internal ({internalScholarships.length})
                        </TabsTrigger>
                        <TabsTrigger value="external">
                            External ({externalScholarships.length})
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="internal">
                        <Card>
                            <CardContent className="p-0">
                                <ScholarshipTable data={internalScholarships} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="external">
                        <Card>
                            <CardContent className="p-0">
                                <ScholarshipTable data={externalScholarships} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
