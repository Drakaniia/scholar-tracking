'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
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
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  SCHOLARSHIP_TYPES,
  EXTERNAL_CATEGORIES,
  CreateScholarshipInput,
} from '@/types';

interface Scholarship {
  id: number;
  name: string;
  description: string | null;
  type: 'Internal' | 'External';
  category: string | null;
  amount: number;
  eligibility: string | null;
  applicationStart: string | null;
  applicationEnd: string | null;
  isActive: boolean;
  _count: {
    students: number;
  };
}

export default function AdminScholarshipsPage() {
  const router = useRouter();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScholarship, setEditingScholarship] =
    useState<Scholarship | null>(null);
  const [formData, setFormData] = useState<CreateScholarshipInput>({
    name: '',
    description: '',
    type: 'Internal',
    category: '',
    amount: 0,
    eligibility: '',
    applicationStart: undefined,
    applicationEnd: undefined,
    isActive: true,
  });

  const fetchScholarships = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      params.append('limit', '100');

      const res = await fetch(`/api/admin/scholarships?${params}`);
      const json = await res.json();
      if (json.success) {
        setScholarships(json.data);
      } else if (res.status === 401) {
        router.push('/admin/login');
      }
    } catch (error) {
      console.error('Error fetching scholarships:', error);
      toast.error('Failed to fetch scholarships');
    } finally {
      setLoading(false);
    }
  }, [search, router]);

  useEffect(() => {
    fetchScholarships();
  }, [search, fetchScholarships]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingScholarship
        ? `/api/admin/scholarships/${editingScholarship.id}`
        : '/api/admin/scholarships';
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
      const res = await fetch(`/api/admin/scholarships/${id}`, {
        method: 'DELETE',
      });
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
      name: scholarship.name,
      description: scholarship.description || '',
      type: scholarship.type,
      category: scholarship.category || '',
      amount: scholarship.amount,
      eligibility: scholarship.eligibility || '',
      applicationStart: scholarship.applicationStart
        ? new Date(scholarship.applicationStart)
        : undefined,
      applicationEnd: scholarship.applicationEnd
        ? new Date(scholarship.applicationEnd)
        : undefined,
      isActive: scholarship.isActive,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'Internal',
      category: '',
      amount: 0,
      eligibility: '',
      applicationStart: undefined,
      applicationEnd: undefined,
      isActive: true,
    });
    setEditingScholarship(null);
  };

  const internalScholarships = scholarships.filter(s => s.type === 'Internal');
  const externalScholarships = scholarships.filter(s => s.type === 'External');

  const ScholarshipTable = ({ data }: { data: Scholarship[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Application Period</TableHead>
          <TableHead>Recipients</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={7}
              className="h-24 text-center text-muted-foreground"
            >
              No scholarships found
            </TableCell>
          </TableRow>
        ) : (
          data.map(scholarship => (
            <TableRow key={scholarship.id}>
              <TableCell className="font-medium">{scholarship.name}</TableCell>
              <TableCell>
                {scholarship.type === 'External' && scholarship.category ? (
                  <Badge variant="secondary">{scholarship.category}</Badge>
                ) : (
                  <Badge variant="outline">Cash Assistance</Badge>
                )}
              </TableCell>
              <TableCell>{formatCurrency(scholarship.amount)}</TableCell>
              <TableCell>
                <Badge
                  variant={scholarship.isActive ? 'default' : 'secondary'}
                  className={
                    scholarship.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                      : ''
                  }
                >
                  {scholarship.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                {scholarship.applicationStart && scholarship.applicationEnd ? (
                  <span className="text-sm">
                    {formatDate(scholarship.applicationStart)} -{' '}
                    {formatDate(scholarship.applicationEnd)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Open</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{scholarship._count.students}</Badge>
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
      <PageHeader
        title="Scholarships"
        description="Manage scholarship programs"
      >
        <Dialog
          open={dialogOpen}
          onOpenChange={open => {
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
                {editingScholarship
                  ? 'Edit Scholarship'
                  : 'Add New Scholarship'}
              </DialogTitle>
              <DialogDescription>
                {editingScholarship
                  ? 'Update scholarship information'
                  : 'Create a new scholarship program'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Scholarship Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: 'Internal' | 'External') =>
                      setFormData({ ...formData, type: value, category: '' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SCHOLARSHIP_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {formData.type === 'External' && (
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={formData.category || ''}
                      onValueChange={value =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXTERNAL_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₱)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amount}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={e =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="eligibility">Eligibility Requirements</Label>
                <Textarea
                  id="eligibility"
                  value={formData.eligibility || ''}
                  onChange={e =>
                    setFormData({ ...formData, eligibility: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="applicationStart">Start Date</Label>
                  <Input
                    id="applicationStart"
                    type="date"
                    value={
                      formData.applicationStart
                        ? new Date(formData.applicationStart)
                            .toISOString()
                            .split('T')[0]
                        : ''
                    }
                    onChange={e =>
                      setFormData({
                        ...formData,
                        applicationStart: e.target.value
                          ? new Date(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationEnd">End Date</Label>
                  <Input
                    id="applicationEnd"
                    type="date"
                    value={
                      formData.applicationEnd
                        ? new Date(formData.applicationEnd)
                            .toISOString()
                            .split('T')[0]
                        : ''
                    }
                    onChange={e =>
                      setFormData({
                        ...formData,
                        applicationEnd: e.target.value
                          ? new Date(e.target.value)
                          : undefined,
                      })
                    }
                  />
                </div>
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

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search scholarships..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

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
