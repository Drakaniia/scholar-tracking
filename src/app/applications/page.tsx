'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Check, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrency, formatDate, getFullName, getStatusColor } from '@/lib/utils';
import { APPLICATION_STATUSES, CreateApplicationInput } from '@/types';

interface Application {
    id: number;
    status: string;
    dateApplied: string;
    dateApproved: string | null;
    remarks: string | null;
    student: {
        id: number;
        firstName: string;
        middleName: string | null;
        lastName: string;
        course: string;
        educationLevel: string;
    };
    scholarship: {
        id: number;
        name: string;
        type: string;
        category: string | null;
        amount: number;
    };
}

interface Student {
    id: number;
    firstName: string;
    middleName: string | null;
    lastName: string;
}

interface Scholarship {
    id: number;
    name: string;
    type: string;
    amount: number;
}

export default function ApplicationsPage() {
    const [applications, setApplications] = useState<Application[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [scholarships, setScholarships] = useState<Scholarship[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [formData, setFormData] = useState<CreateApplicationInput>({
        studentId: 0,
        scholarshipId: 0,
        remarks: '',
    });

    const fetchApplications = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            params.append('limit', '100');

            const res = await fetch(`/api/applications?${params}`);
            const json = await res.json();
            if (json.success) {
                setApplications(json.data);
            }
        } catch (error) {
            console.error('Error fetching applications:', error);
            toast.error('Failed to fetch applications');
        } finally {
            setLoading(false);
        }
    }, [statusFilter]);

    const fetchStudentsAndScholarships = useCallback(async () => {
        try {
            const [studentsRes, scholarshipsRes] = await Promise.all([
                fetch('/api/students?limit=1000'),
                fetch('/api/scholarships?limit=1000&isActive=true'),
            ]);

            const studentsJson = await studentsRes.json();
            const scholarshipsJson = await scholarshipsRes.json();

            if (studentsJson.success) setStudents(studentsJson.data);
            if (scholarshipsJson.success) setScholarships(scholarshipsJson.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }, []);

    useEffect(() => {
        fetchApplications();
        fetchStudentsAndScholarships();
    }, [statusFilter, fetchApplications, fetchStudentsAndScholarships]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.studentId || !formData.scholarshipId) {
            toast.error('Please select both a student and a scholarship');
            return;
        }

        try {
            const res = await fetch('/api/applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (json.success) {
                toast.success('Scholarship assigned successfully');
                setDialogOpen(false);
                resetForm();
                fetchApplications();
            } else {
                toast.error(json.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error creating application:', error);
            toast.error('Failed to assign scholarship');
        }
    };

    const handleStatusUpdate = async (id: number, status: string) => {
        try {
            const res = await fetch(`/api/applications/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            const json = await res.json();
            if (json.success) {
                toast.success(`Application ${status.toLowerCase()}`);
                fetchApplications();
            } else {
                toast.error(json.error || 'Update failed');
            }
        } catch (error) {
            console.error('Error updating application:', error);
            toast.error('Failed to update application');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to remove this scholarship assignment?'))
            return;

        try {
            const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                toast.success('Application removed');
                fetchApplications();
            } else {
                toast.error(json.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting application:', error);
            toast.error('Failed to remove application');
        }
    };

    const resetForm = () => {
        setFormData({
            studentId: 0,
            scholarshipId: 0,
            remarks: '',
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'Approved':
                return <Check className="h-4 w-4 text-green-600" />;
            case 'Rejected':
                return <X className="h-4 w-4 text-red-600" />;
            case 'Pending':
                return <Clock className="h-4 w-4 text-yellow-600" />;
            default:
                return null;
        }
    };

    return (
        <div>
            <PageHeader
                title="Applications"
                description="Track and manage scholarship applications"
            >
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
                            Assign Scholarship
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Assign Scholarship to Student</DialogTitle>
                            <DialogDescription>
                                Select a student and scholarship to create a new application
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="student">Student</Label>
                                <Select
                                    value={formData.studentId ? String(formData.studentId) : ''}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, studentId: parseInt(value) })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a student" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {students.map((student) => (
                                            <SelectItem key={student.id} value={String(student.id)}>
                                                {getFullName(
                                                    student.firstName,
                                                    student.middleName,
                                                    student.lastName
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="scholarship">Scholarship</Label>
                                <Select
                                    value={
                                        formData.scholarshipId ? String(formData.scholarshipId) : ''
                                    }
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, scholarshipId: parseInt(value) })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a scholarship" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {scholarships.map((scholarship) => (
                                            <SelectItem
                                                key={scholarship.id}
                                                value={String(scholarship.id)}
                                            >
                                                {scholarship.name} ({formatCurrency(scholarship.amount)})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="remarks">Remarks (Optional)</Label>
                                <Textarea
                                    id="remarks"
                                    value={formData.remarks || ''}
                                    onChange={(e) =>
                                        setFormData({ ...formData, remarks: e.target.value })
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
                                <Button type="submit">Assign</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <Select
                            value={statusFilter || 'all'}
                            onValueChange={(value) =>
                                setStatusFilter(value === 'all' ? '' : value)
                            }
                        >
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                {APPLICATION_STATUSES.map((status) => (
                                    <SelectItem key={status} value={status}>
                                        {status}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                            <Badge variant="outline" className="px-3 py-1">
                                Total: {applications.length}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="bg-yellow-100 text-yellow-800 px-3 py-1"
                            >
                                Pending: {applications.filter((a) => a.status === 'Pending').length}
                            </Badge>
                            <Badge
                                variant="outline"
                                className="bg-green-100 text-green-800 px-3 py-1"
                            >
                                Approved:{' '}
                                {applications.filter((a) => a.status === 'Approved').length}
                            </Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Applications Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : applications.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
                            <p>No applications found</p>
                            <p className="text-sm">
                                Assign scholarships to students to get started
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Scholarship</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Applied</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {applications.map((app) => (
                                    <TableRow key={app.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">
                                                    {getFullName(
                                                        app.student.firstName,
                                                        app.student.middleName,
                                                        app.student.lastName
                                                    )}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {app.student.course}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {app.scholarship.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {app.scholarship.type}
                                                {app.scholarship.category &&
                                                    ` - ${app.scholarship.category}`}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {formatCurrency(app.scholarship.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge className={getStatusColor(app.status)}>
                                                <span className="flex items-center gap-1">
                                                    {getStatusIcon(app.status)}
                                                    {app.status}
                                                </span>
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{formatDate(app.dateApplied)}</TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {app.status === 'Pending' && (
                                                        <>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleStatusUpdate(app.id, 'Approved')
                                                                }
                                                                className="text-green-600"
                                                            >
                                                                <Check className="mr-2 h-4 w-4" />
                                                                Approve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    handleStatusUpdate(app.id, 'Rejected')
                                                                }
                                                                className="text-red-600"
                                                            >
                                                                <X className="mr-2 h-4 w-4" />
                                                                Reject
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                    <DropdownMenuItem
                                                        onClick={() => handleDelete(app.id)}
                                                        className="text-destructive"
                                                    >
                                                        <X className="mr-2 h-4 w-4" />
                                                        Remove
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
