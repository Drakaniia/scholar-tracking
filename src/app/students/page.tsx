'use client';

import { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { YEAR_LEVELS, CreateStudentInput } from '@/types';

interface Student {
    id: number;
    studentNo: string;
    fullName: string;
    program: string;
    yearLevel: string;
    email: string;
    status: string;
    applications: Array<{
        scholarship: {
            scholarshipName: string;
            type: string;
        };
        status: string;
    }>;
}

const STUDENT_STATUSES = ['Active', 'Inactive', 'Graduated', 'On Leave'] as const;

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [yearFilter, setYearFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState<CreateStudentInput>({
        studentNo: '',
        fullName: '',
        program: '',
        yearLevel: '1st Year',
        email: '',
        status: 'Active',
    });

    const fetchStudents = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (yearFilter && yearFilter !== 'all') params.append('yearLevel', yearFilter);
            params.append('limit', '100');

            const res = await fetch(`/api/students?${params}`);
            const json = await res.json();
            if (json.success) {
                setStudents(json.data);
            }
        } catch (error) {
            console.error('Error fetching students:', error);
            toast.error('Failed to fetch students');
        } finally {
            setLoading(false);
        }
    }, [search, yearFilter]);

    useEffect(() => {
        fetchStudents();
    }, [search, yearFilter, fetchStudents]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingStudent
                ? `/api/students/${editingStudent.id}`
                : '/api/students';
            const method = editingStudent ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const json = await res.json();
            if (json.success) {
                toast.success(
                    editingStudent
                        ? 'Student updated successfully'
                        : 'Student created successfully'
                );
                setDialogOpen(false);
                setEditingStudent(null);
                resetForm();
                fetchStudents();
            } else {
                toast.error(json.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving student:', error);
            toast.error('Failed to save student');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this student?')) return;

        try {
            const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
            const json = await res.json();
            if (json.success) {
                toast.success('Student deleted successfully');
                fetchStudents();
            } else {
                toast.error(json.error || 'Delete failed');
            }
        } catch (error) {
            console.error('Error deleting student:', error);
            toast.error('Failed to delete student');
        }
    };

    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setFormData({
            studentNo: student.studentNo,
            fullName: student.fullName,
            program: student.program,
            yearLevel: student.yearLevel,
            email: student.email,
            status: student.status,
        });
        setDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            studentNo: '',
            fullName: '',
            program: '',
            yearLevel: '1st Year',
            email: '',
            status: 'Active',
        });
        setEditingStudent(null);
    };

    return (
        <div>
            <PageHeader title="Students" description="Manage student records">
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
                            Add Student
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {editingStudent ? 'Edit Student' : 'Add New Student'}
                            </DialogTitle>
                            <DialogDescription>
                                {editingStudent
                                    ? 'Update student information'
                                    : 'Enter student details to add a new record'}
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="studentNo">Student No.</Label>
                                <Input
                                    id="studentNo"
                                    value={formData.studentNo}
                                    onChange={(e) =>
                                        setFormData({ ...formData, studentNo: e.target.value })
                                    }
                                    placeholder="e.g., STU-2024-001"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="fullName">Full Name</Label>
                                <Input
                                    id="fullName"
                                    value={formData.fullName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, fullName: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({ ...formData, email: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="program">Program</Label>
                                <Input
                                    id="program"
                                    value={formData.program}
                                    onChange={(e) =>
                                        setFormData({ ...formData, program: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="yearLevel">Year Level</Label>
                                    <Select
                                        value={formData.yearLevel}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, yearLevel: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {YEAR_LEVELS.map((level) => (
                                                <SelectItem key={level} value={level}>
                                                    {level}
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
                                            {STUDENT_STATUSES.map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
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
                                    {editingStudent ? 'Update' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </PageHeader>

            {/* Filters */}
            <Card className="mb-6">
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, student no, or program..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={yearFilter} onValueChange={setYearFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="All Year Levels" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Year Levels</SelectItem>
                                {YEAR_LEVELS.map((level) => (
                                    <SelectItem key={level} value={level}>
                                        {level}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Students Table */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex h-48 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : students.length === 0 ? (
                        <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
                            <p>No students found</p>
                            <p className="text-sm">Add your first student to get started</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Student No.</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Program</TableHead>
                                    <TableHead>Year Level</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Applications</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-mono text-sm">
                                            {student.studentNo}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {student.fullName}
                                        </TableCell>
                                        <TableCell>{student.program}</TableCell>
                                        <TableCell>{student.yearLevel}</TableCell>
                                        <TableCell>{student.email}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={student.status === 'Active' ? 'default' : 'secondary'}
                                            >
                                                {student.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {student.applications.length > 0 ? (
                                                <Badge>{student.applications.length} application(s)</Badge>
                                            ) : (
                                                <span className="text-muted-foreground">None</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleEdit(student)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(student.id)}
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
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
