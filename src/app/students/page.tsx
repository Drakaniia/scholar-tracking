'use client';

// Force rebuild
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
import { formatCurrency, getFullName } from '@/lib/utils';
import {
    YEAR_LEVELS,
    EDUCATION_LEVELS,
    CreateStudentInput,
} from '@/types';

interface Student {
    id: number;
    firstName: string;
    middleName: string | null;
    lastName: string;
    yearLevel: string;
    course: string;
    tuitionFee: number;
    educationLevel: string;
    scholarships: Array<{
        scholarship: {
            name: string;
            type: string;
        };
        status: string;
    }>;
}

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [educationFilter, setEducationFilter] = useState('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState<CreateStudentInput>({
        firstName: '',
        middleName: '',
        lastName: '',
        yearLevel: '1st Year',
        course: '',
        tuitionFee: 0,
        educationLevel: 'College',
    });

    const fetchStudents = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (educationFilter && educationFilter !== 'all') params.append('educationLevel', educationFilter);
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
    }, [search, educationFilter]);

    useEffect(() => {
        fetchStudents();
    }, [search, educationFilter, fetchStudents]);

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
            firstName: student.firstName,
            middleName: student.middleName || '',
            lastName: student.lastName,
            yearLevel: student.yearLevel,
            course: student.course,
            tuitionFee: student.tuitionFee,
            educationLevel: student.educationLevel,
        });
        setDialogOpen(true);
    };

    const resetForm = () => {
        setFormData({
            firstName: '',
            middleName: '',
            lastName: '',
            yearLevel: '1st Year',
            course: '',
            tuitionFee: 0,
            educationLevel: 'College',
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) =>
                                            setFormData({ ...formData, firstName: e.target.value })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="middleName">Middle Name</Label>
                                    <Input
                                        id="middleName"
                                        value={formData.middleName || ''}
                                        onChange={(e) =>
                                            setFormData({ ...formData, middleName: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, lastName: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="educationLevel">Education Level</Label>
                                    <Select
                                        value={formData.educationLevel}
                                        onValueChange={(value) =>
                                            setFormData({ ...formData, educationLevel: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {EDUCATION_LEVELS.map((level) => (
                                                <SelectItem key={level} value={level}>
                                                    {level}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="course">Course/Program</Label>
                                <Input
                                    id="course"
                                    value={formData.course}
                                    onChange={(e) =>
                                        setFormData({ ...formData, course: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tuitionFee">Tuition Fee (₱)</Label>
                                <Input
                                    id="tuitionFee"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={formData.tuitionFee}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            tuitionFee: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    required
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
                                placeholder="Search by name or course..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select
                            value={educationFilter}
                            onValueChange={setEducationFilter}
                        >
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="All Education Levels" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                {EDUCATION_LEVELS.map((level) => (
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
                                    <TableHead>Name</TableHead>
                                    <TableHead>Education Level</TableHead>
                                    <TableHead>Year Level</TableHead>
                                    <TableHead>Course</TableHead>
                                    <TableHead>Tuition Fee</TableHead>
                                    <TableHead>Scholarships</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow key={student.id}>
                                        <TableCell className="font-medium">
                                            {getFullName(
                                                student.firstName,
                                                student.middleName,
                                                student.lastName
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{student.educationLevel}</Badge>
                                        </TableCell>
                                        <TableCell>{student.yearLevel}</TableCell>
                                        <TableCell>{student.course}</TableCell>
                                        <TableCell>{formatCurrency(student.tuitionFee)}</TableCell>
                                        <TableCell>
                                            {student.scholarships.length > 0 ? (
                                                <Badge>{student.scholarships.length} scholarship(s)</Badge>
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
