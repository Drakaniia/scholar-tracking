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
import { useAuth } from '@/components/auth/auth-provider';

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
        source: string;
    } | null;
}

interface StudentDetail extends Student {
    awardDate: string | null;
    startTerm: string | null;
    endTerm: string | null;
    grantAmount: number | null;
    disbursements: Array<{
        id: number;
        amount: number;
        disbursementDate: string;
        term: string;
        method: string;
        scholarship: {
            scholarshipName: string;
            type: string;
            source: string;
        };
    }>;
    fees: Array<{
        tuitionFee: number;
        otherFee: number;
        miscellaneousFee: number;
        laboratoryFee: number;
        amountSubsidy: number;
        percentSubsidy: number;
        term: string;
        academicYear: string;
    }>;
}

export default function StudentsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMIN';
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

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

    const handleViewDetails = async (studentId: number) => {
        setLoadingDetail(true);
        setDetailDialogOpen(true);
        try {
            const res = await fetch(`/api/students/${studentId}`);
            const json = await res.json();
            if (json.success) {
                setSelectedStudent(json.data);
            } else {
                toast.error('Failed to load student details');
            }
        } catch (error) {
            console.error('Error fetching student details:', error);
            toast.error('Failed to load student details');
        } finally {
            setLoadingDetail(false);
        }
    };

    return (
        <div>
            <PageHeader title="Students" description="Manage student records">
                <div className="flex gap-2">
                    <ExportButton endpoint="/api/export/students" filename="detailed-student-scholarship-report" />
                    {isAdmin && (
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
                    )}
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
                                    <TableHead>Source</TableHead>
                                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.map((student) => (
                                    <TableRow 
                                        key={student.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleViewDetails(student.id)}
                                    >
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
                                                <Badge variant={student.scholarshipStatus === 'Active' ? 'default' : 'secondary'}>
                                                    {student.scholarship.scholarshipName}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">None</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {student.scholarship ? (
                                                <Badge variant={student.scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}>
                                                    {student.scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Student Detail Dialog */}
            <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Student Details</DialogTitle>
                        <DialogDescription>
                            Complete information about the student and their scholarships
                        </DialogDescription>
                    </DialogHeader>
                    {loadingDetail ? (
                        <div className="flex h-48 items-center justify-center">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                        </div>
                    ) : selectedStudent ? (
                        <div className="space-y-6">
                            {/* Basic Information */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Student Number</p>
                                    <p className="text-lg font-mono">{selectedStudent.studentNo}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                                    <p className="text-lg">{selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.middleInitial || ''}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Grade Level</p>
                                    <Badge variant="outline">{GRADE_LEVEL_LABELS[selectedStudent.gradeLevel]}</Badge>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Year Level</p>
                                    <p className="text-lg">{selectedStudent.yearLevel}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm font-medium text-muted-foreground">Program</p>
                                    <p className="text-lg">{selectedStudent.program}</p>
                                </div>
                            </div>

                            {/* Scholarship Information */}
                            <div className="border-t pt-4">
                                <h3 className="text-lg font-semibold mb-4">Scholarship Information</h3>
                                {selectedStudent.scholarship ? (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Scholarship Name</p>
                                                <p className="text-lg">{selectedStudent.scholarship.scholarshipName}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Type</p>
                                                <Badge variant="outline">{selectedStudent.scholarship.type}</Badge>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Source</p>
                                                <Badge variant={selectedStudent.scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}>
                                                    {selectedStudent.scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Status</p>
                                                <Badge variant={selectedStudent.scholarshipStatus === 'Active' ? 'default' : 'secondary'}>
                                                    {selectedStudent.scholarshipStatus}
                                                </Badge>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Grant Amount</p>
                                                <p className="text-lg font-semibold">{selectedStudent.grantAmount?.toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Award Date</p>
                                                <p className="text-lg">{selectedStudent.awardDate ? new Date(selectedStudent.awardDate).toLocaleDateString() : '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">Start Term</p>
                                                <p className="text-lg">{selectedStudent.startTerm || '-'}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-muted-foreground">End Term</p>
                                                <p className="text-lg">{selectedStudent.endTerm || '-'}</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">No scholarship assigned</p>
                                )}
                            </div>

                            {/* Disbursements */}
                            {selectedStudent.disbursements && selectedStudent.disbursements.length > 0 && (
                                <div className="border-t pt-4">
                                    <h3 className="text-lg font-semibold mb-4">Disbursement History</h3>
                                    <div className="space-y-2">
                                        {selectedStudent.disbursements.map((disbursement) => (
                                            <div key={disbursement.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                                <div>
                                                    <p className="font-medium">{disbursement.scholarship.scholarshipName}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {disbursement.term} • {new Date(disbursement.disbursementDate).toLocaleDateString()} • {disbursement.method}
                                                    </p>
                                                    <Badge variant={disbursement.scholarship.source === 'INTERNAL' ? 'default' : 'secondary'} className="mt-1">
                                                        {disbursement.scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                                                    </Badge>
                                                </div>
                                                <p className="text-lg font-semibold">{disbursement.amount.toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                                        <p className="text-sm font-medium text-muted-foreground">Total Disbursed</p>
                                        <p className="text-2xl font-bold">
                                            {selectedStudent.disbursements.reduce((sum, d) => sum + Number(d.amount), 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Fees Information */}
                            {selectedStudent.fees && selectedStudent.fees.length > 0 && (
                                <div className="border-t pt-4">
                                    <h3 className="text-lg font-semibold mb-4">Fee Information</h3>
                                    {selectedStudent.fees.map((fee, index) => (
                                        <div key={index} className="space-y-2 mb-4">
                                            <p className="font-medium">{fee.term} - {fee.academicYear}</p>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Tuition Fee:</span>
                                                    <span>{fee.tuitionFee.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Other Fee:</span>
                                                    <span>{fee.otherFee.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Miscellaneous:</span>
                                                    <span>{fee.miscellaneousFee.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span className="text-muted-foreground">Laboratory:</span>
                                                    <span>{fee.laboratoryFee.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between font-semibold border-t pt-2">
                                                    <span>Total Fees:</span>
                                                    <span>{(Number(fee.tuitionFee) + Number(fee.otherFee) + Number(fee.miscellaneousFee) + Number(fee.laboratoryFee)).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between font-semibold text-green-600 border-t pt-2">
                                                    <span>Subsidy ({fee.percentSubsidy}%):</span>
                                                    <span>{fee.amountSubsidy.toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No data available</p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
