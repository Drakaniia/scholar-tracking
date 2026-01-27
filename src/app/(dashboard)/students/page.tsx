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
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { GRADE_LEVELS, GRADE_LEVEL_LABELS, GradeLevel, CreateStudentInput } from '@/types';
import { StudentForm } from '@/components/forms/student-form';
import { ExportButton } from '@/components/shared';

interface Student {
    id: number;
    studentNo: string;
    lastName: string;
    firstName: string;
    middleInitial: string | null;
    program: string;
    gradeLevel: GradeLevel;
    yearLevel: string;
    status: string;
    scholarshipId: number | null;
    scholarshipStatus: string | null;
    scholarship: {
        scholarshipName: string;
        type: string;
    } | null;
}

export default function StudentsPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const fetchStudents = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (gradeLevelFilter && gradeLevelFilter !== 'all') params.append('gradeLevel', gradeLevelFilter);
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
    }, [search, gradeLevelFilter]);

    useEffect(() => {
        fetchStudents();
    }, [search, gradeLevelFilter, fetchStudents]);

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
        setDialogOpen(true);
    };

    const handleFormSubmit = async (data: CreateStudentInput) => {
        try {
            const url = editingStudent
                ? `/api/students/${editingStudent.id}`
                : '/api/students';
            const method = editingStudent ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
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
                fetchStudents();
            } else {
                toast.error(json.error || 'Operation failed');
            }
        } catch (error) {
            console.error('Error saving student:', error);
            toast.error('Failed to save student');
        }
    };

    return (
        <div>
            <PageHeader title="Students" description="Manage student records">
                <div className="flex gap-2">
                    <ExportButton endpoint="/api/export/students" filename="detailed-student-scholarship-report" />
                    <Dialog
                        open={dialogOpen}
                        onOpenChange={(open) => {
                            setDialogOpen(open);
                            if (!open) setEditingStudent(null);
                        }}
                    >
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Student
                            </Button>
                        </DialogTrigger>
                    <DialogContent className="max-w-2xl">
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
                        <StudentForm
                            defaultValues={editingStudent ? {
                                studentNo: editingStudent.studentNo,
                                lastName: editingStudent.lastName,
                                firstName: editingStudent.firstName,
                                middleInitial: editingStudent.middleInitial || '',
                                program: editingStudent.program,
                                gradeLevel: editingStudent.gradeLevel,
                                yearLevel: editingStudent.yearLevel,
                                status: editingStudent.status,
                            } : undefined}
                            onSubmit={handleFormSubmit}
                            onCancel={() => setDialogOpen(false)}
                            isEditing={!!editingStudent}
                        />
                    </DialogContent>
                </Dialog>
                </div>
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
                        <Select value={gradeLevelFilter} onValueChange={setGradeLevelFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue placeholder="All Grade Levels" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Grade Levels</SelectItem>
                                {GRADE_LEVELS.map((level) => (
                                    <SelectItem key={level} value={level}>
                                        {GRADE_LEVEL_LABELS[level]}
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
                                    <TableHead>Grade Level</TableHead>
                                    <TableHead>Year Level</TableHead>
                                    <TableHead>Program</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Scholarships</TableHead>
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
                                            {student.lastName}, {student.firstName} {student.middleInitial || ''}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {GRADE_LEVEL_LABELS[student.gradeLevel]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{student.yearLevel}</TableCell>
                                        <TableCell>{student.program}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={student.status === 'Active' ? 'default' : 'secondary'}
                                            >
                                                {student.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {student.scholarship ? (
                                                <div>
                                                    <Badge variant={student.scholarshipStatus === 'Active' ? 'default' : 'secondary'}>
                                                        {student.scholarship.scholarshipName}
                                                    </Badge>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        {student.scholarship.type}
                                                    </p>
                                                </div>
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
