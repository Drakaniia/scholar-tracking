'use client';

import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, Pencil, Archive, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { GRADE_LEVELS, GRADE_LEVEL_LABELS, CreateStudentInput, Student, StudentScholarship, Disbursement, StudentFees, GradeLevel, GrantType } from '@/types';
import { StudentForm } from '@/components/forms/student-form';
import { ExportButton } from '@/components/shared';
import { ImportButton } from '@/components/shared/import-button';
import { useAuth } from '@/components/auth/auth-provider';
import { StudentFeesManager } from '@/components/forms/student-fees-manager';
import { useDebounce } from '@/hooks/use-debounce';
import {
  useStudents,
  useStudent,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  useStudentFilterOptions,
} from '@/hooks/use-queries';

type StudentMutationData = {
  id?: number;
  lastName: string;
  firstName: string;
  middleInitial?: string;
  program: string;
  gradeLevel: GradeLevel;
  yearLevel: string;
  status: string;
  birthDate?: Date | null;
  scholarships?: Array<{
    scholarshipId: number;
    awardDate: Date;
    startTerm: string;
    endTerm: string;
    grantAmount: number;
    grantType?: GrantType;
    scholarshipStatus: string;
  }>;
};

// Pastel colors for scholarships
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

interface StudentWithScholarships extends Student {
 scholarships: StudentScholarship[];
}

interface StudentDetail extends Student {
 disbursements: Disbursement[];
 fees: StudentFees[];
}

export default function StudentsPage() {
 const { user } = useAuth();
 const isAdmin = user?.role === 'ADMIN';
 const queryClient = useQueryClient();
 const [students, setStudents] = useState<Student[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const debouncedSearch = useDebounce(search, 300); // Debounce search by 300ms
 const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
 const [programFilter, setProgramFilter] = useState<string>('all');
 const [statusFilter, setStatusFilter] = useState<string>('all');
 const [scholarshipFilter, setScholarshipFilter] = useState<string>('all');
 const [dialogOpen, setDialogOpen] = useState(false);
 const [editingStudent, setEditingStudent] = useState<StudentWithScholarships | null>(null);
 const [detailDialogOpen, setDetailDialogOpen] = useState(false);
 const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null);
 const [loadingDetail, setLoadingDetail] = useState(false);
 const [showFullDetails, setShowFullDetails] = useState(false);
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [total, setTotal] = useState(0);
 const [programs, setPrograms] = useState<string[]>([]);
 const [scholarships, setScholarships] = useState<Array<{ id: number; scholarshipName: string; _count?: { students: number } }>>([]);
 const [studentsWithoutScholarship, setStudentsWithoutScholarship] = useState<number>(0);
 const [gradeLevelCounts, setGradeLevelCounts] = useState<Record<string, number>>({});
 const [programCounts, setProgramCounts] = useState<Record<string, number>>({});
 const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
 const [filteredTotal, setFilteredTotal] = useState<number>(0);
 const [dynamicScholarshipCounts, setDynamicScholarshipCounts] = useState<Record<string, number>>({});
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredScholarshipId, setHoveredScholarshipId] = useState<number | null>(null);

  // TanStack Query hooks for data fetching
  const { data: studentsData, isLoading: studentsLoading } = useStudents(
    {
      search: debouncedSearch,
      gradeLevel: gradeLevelFilter === 'all' ? undefined : gradeLevelFilter,
      program: programFilter === 'all' ? undefined : programFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      scholarshipId: scholarshipFilter === 'all' ? undefined : scholarshipFilter,
      page,
      limit: 11,
    }
  );

  const { data: studentDetail, isLoading: detailLoading } = useStudent(
    selectedStudent?.id || 0,
    { enabled: !!selectedStudent?.id }
  );

  const createStudentMutation = useCreateStudent();
  const updateStudentMutation = useUpdateStudent();
  const deleteStudentMutation = useDeleteStudent();

  const { data: filterOptionsData } = useStudentFilterOptions();

  // Update state when TanStack Query data changes
  useEffect(() => {
    if (studentsData) {
      setStudents((studentsData.data || []) as unknown as Student[]);
      setTotal(studentsData.total || 0);
      setTotalPages(studentsData.totalPages || 1);
    }
  }, [studentsData]);

  useEffect(() => {
    setLoading(studentsLoading);
  }, [studentsLoading]);

  useEffect(() => {
    if (studentDetail?.data && selectedStudent) {
      setSelectedStudent(studentDetail.data as unknown as StudentDetail);
    }
  }, [studentDetail, selectedStudent]);

  useEffect(() => {
    setLoadingDetail(detailLoading);
  }, [detailLoading]);

  useEffect(() => {
    if (filterOptionsData) {
      const data = filterOptionsData.data as {
        programs: string[];
        scholarships: Array<{ id: number; scholarshipName: string; _count?: { students: number } }>;
        studentsWithoutScholarship: number;
        gradeLevelCounts: Record<string, number>;
        programCounts: Record<string, number>;
        statusCounts: Record<string, number>;
        filteredTotal: number;
        dynamicScholarshipCounts: Record<string, number>;
      };
      setPrograms(data.programs || []);
      setScholarships(data.scholarships || []);
      setStudentsWithoutScholarship(data.studentsWithoutScholarship || 0);
      setGradeLevelCounts(data.gradeLevelCounts || {});
      setProgramCounts(data.programCounts || {});
      setStatusCounts(data.statusCounts || {});
      setFilteredTotal(data.filteredTotal || 0);
      setDynamicScholarshipCounts(data.dynamicScholarshipCounts || {});
    }
  }, [filterOptionsData]);

 useEffect(() => {
 // Reset to page 1 when filters change
 setPage(1);
 }, [debouncedSearch, gradeLevelFilter, programFilter, statusFilter, scholarshipFilter]);

 

 const openDeleteDialog = (student: Student) => {
 setDeletingStudent(student);
 setDeleteDialogOpen(true);
 };

const closeDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setDeletingStudent(null);
  };

  // Optimized hover handler with immediate response
  const handleScholarshipHover = useCallback((scholarshipId: number | null) => {
    setHoveredScholarshipId(scholarshipId);
  }, []);

  const handleEdit = async (student: Student) => {
 setEditingStudent(student as StudentWithScholarships);
 setDialogOpen(true);
 };

 const handleFormSubmit = async (data: CreateStudentInput) => {
 setSubmitting(true);
 try {
   const mutationData: StudentMutationData = {
     lastName: data.lastName,
     firstName: data.firstName,
     middleInitial: data.middleInitial,
     program: data.program,
     gradeLevel: data.gradeLevel,
     yearLevel: data.yearLevel,
     status: data.status,
     birthDate: data.birthDate || null,
     scholarships: data.scholarships?.map(s => ({
       scholarshipId: s.scholarshipId,
       awardDate: s.awardDate,
       startTerm: s.startTerm,
       endTerm: s.endTerm,
       grantAmount: s.grantAmount,
       grantType: s.grantType,
       scholarshipStatus: s.scholarshipStatus,
     })),
   };

   if (editingStudent) {
     await updateStudentMutation.mutateAsync({ id: editingStudent.id, data: mutationData });
   } else {
     await createStudentMutation.mutateAsync(mutationData);
   }
   setDialogOpen(false);
   setEditingStudent(null);
 } catch {
   // Error handling is already in mutation hooks
 } finally {
   setSubmitting(false);
 }
 };

const handleViewDetails = (studentId: number) => {
  setSelectedStudent({ id: studentId } as StudentDetail);
  setDetailDialogOpen(true);
  setShowFullDetails(false);
  setLoadingDetail(true);
  // useStudent hook will fetch automatically due to enabled: !!selectedStudent?.id
  };

  const handleDelete = async () => {
    if (!deletingStudent) return;

    setSubmitting(true);

    try {
      await deleteStudentMutation.mutateAsync(deletingStudent.id);
      setDeleteDialogOpen(false);
      setDeletingStudent(null);
    } catch {
      // Error handling is already in mutation hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
 <div>
 <PageHeader title="Students" description="Manage student records">
 <div className="flex gap-2">
 <ExportButton endpoint="/api/export/students" filename="detailed-student-scholarship-report" />
 {isAdmin && (
 <ImportButton onImportComplete={() => {
 // Invalidate all queries to refresh data
 queryClient.invalidateQueries();
 sessionStorage.removeItem('dashboardData');
 sessionStorage.removeItem('detailedStudents');
 window.dispatchEvent(new Event('refreshDashboard'));
 }} />
 )}
 {isAdmin && (
 <Dialog
 open={dialogOpen}
 onOpenChange={(open) => {
 setDialogOpen(open);
 if (!open) setEditingStudent(null);
 }}
 >
 <DialogTrigger asChild>
 <Button variant="gradient">
 <Plus className="mr-2 h-4 w-4" />
 Add Student
 </Button>
 </DialogTrigger>
  <DialogContent className="sm:max-w-4xl md:max-w-5xl lg:max-w-6xl max-h-[90vh] overflow-hidden">
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
  lastName: editingStudent.lastName,
  firstName: editingStudent.firstName,
  middleInitial: editingStudent.middleInitial || '',
  program: editingStudent.program,
  gradeLevel: editingStudent.gradeLevel,
  yearLevel: editingStudent.yearLevel,
  status: editingStudent.status,
  birthDate: editingStudent.birthDate ? new Date(editingStudent.birthDate) : undefined,
  scholarships: editingStudent.scholarships?.map(ss => ({
  scholarshipId: ss.scholarshipId,
  awardDate: new Date(ss.awardDate),
  startTerm: ss.startTerm,
  endTerm: ss.endTerm,
  grantAmount: ss.grantAmount,
  scholarshipStatus: ss.scholarshipStatus,
  })) || [],
  } : undefined}
 onSubmit={handleFormSubmit}
 onCancel={() => setDialogOpen(false)}
 isEditing={!!editingStudent}
 loading={submitting}
 studentName={editingStudent ? `${editingStudent.firstName} ${editingStudent.lastName}` : undefined}
 />
 </DialogContent>
 </Dialog>
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
 placeholder="Search by name or program..."
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
 <Select value={gradeLevelFilter} onValueChange={setGradeLevelFilter}>
 <SelectTrigger className="h-8 w-[160px] text-xs">
 <SelectValue placeholder="Grade Level" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Grades ({filteredTotal})</SelectItem>
 {GRADE_LEVELS.map((level) => (
 <SelectItem key={level} value={level}>
 {GRADE_LEVEL_LABELS[level]} ({gradeLevelCounts[level] || 0})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <Select value={programFilter} onValueChange={setProgramFilter}>
 <SelectTrigger className="h-8 w-[180px] text-xs">
 <SelectValue placeholder="Program" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Programs ({filteredTotal})</SelectItem>
 {programs.filter((program) => program).map((program) => (
 <SelectItem key={program} value={program}>
 {program} ({programCounts[program] || 0})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 <Select value={statusFilter} onValueChange={setStatusFilter}>
 <SelectTrigger className="h-8 w-[140px] text-xs">
 <SelectValue placeholder="Status" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Status ({filteredTotal})</SelectItem>
 <SelectItem value="Active">Active ({statusCounts['Active'] || 0})</SelectItem>
 <SelectItem value="Inactive">Inactive ({statusCounts['Inactive'] || 0})</SelectItem>
 <SelectItem value="Graduated">Graduated ({statusCounts['Graduated'] || 0})</SelectItem>
 <SelectItem value="Withdrawn">Withdrawn ({statusCounts['Withdrawn'] || 0})</SelectItem>
 </SelectContent>
 </Select>

 <Select value={scholarshipFilter} onValueChange={setScholarshipFilter}>
 <SelectTrigger className="h-8 w-[200px] text-xs">
 <SelectValue placeholder="Scholarship" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Scholarships ({filteredTotal})</SelectItem>
 <SelectItem value="none">No Scholarship ({studentsWithoutScholarship})</SelectItem>
 {scholarships.map((scholarship) => (
 <SelectItem key={scholarship.id} value={scholarship.id.toString()}>
 {scholarship.scholarshipName} ({dynamicScholarshipCounts[scholarship.id.toString()] || 0})
 </SelectItem>
 ))}
 </SelectContent>
 </Select>

 {/* Clear Filters Button */}
 {(gradeLevelFilter !== 'all' || programFilter !== 'all' || statusFilter !== 'all' || scholarshipFilter !== 'all' || search) && (
 <Button
 variant="ghost"
 size="sm"
 onClick={() => {
 setSearch('');
 setGradeLevelFilter('all');
 setProgramFilter('all');
 setStatusFilter('all');
 setScholarshipFilter('all');
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

 {/* Students Table */}
 <Card className="border-gray-200">
 <CardHeader>
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <CardTitle className="text-foreground">All Students</CardTitle>
 <Badge variant="outline" className="text-sm">
 Total: {total}
 </Badge>
 </div>
 </div>
 </CardHeader>
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
 <TableHead>Grade Level</TableHead>
 <TableHead>Year Level</TableHead>
 <TableHead>Program</TableHead>
 <TableHead>Status</TableHead>
 <TableHead>Scholarships</TableHead>
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
  <div className="flex flex-wrap gap-1">
  {student.scholarships && student.scholarships.length > 0 ? (
  student.scholarships.map((ss) => {
  const scholarship = ss.scholarship;
  if (!scholarship) return null;

  return (
  <Popover key={ss.id} open={ss.id === hoveredScholarshipId} onOpenChange={(open) => handleScholarshipHover(open ? ss.id : null)}>
  <PopoverTrigger asChild>
  <Badge
  variant="outline"
  style={{
  backgroundColor: getScholarshipColor(scholarship.scholarshipName),
  color: '#374151',
  borderColor: getScholarshipColor(scholarship.scholarshipName),
  }}
  className="cursor-default"
  onMouseEnter={() => handleScholarshipHover(ss.id)}
  onMouseLeave={() => handleScholarshipHover(null)}
  >
  {scholarship.scholarshipName}
  </Badge>
  </PopoverTrigger>
  <PopoverContent
  className="w-64 p-3"
  align="start"
  sideOffset={4}
  avoidCollisions
  hideWhenDetached={false}
  onMouseEnter={() => handleScholarshipHover(ss.id)}
  onMouseLeave={() => handleScholarshipHover(null)}
  >
  <div className="space-y-2">
  <h4 className="font-semibold text-sm">{scholarship.scholarshipName}</h4>
  <div className="flex justify-between items-center">
  <Badge variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'} className="text-xs">
  {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
  </Badge>
  <Badge variant={ss.scholarshipStatus === 'Active' ? 'default' : 'secondary'} className="text-xs">
  {ss.scholarshipStatus}
  </Badge>
  </div>
  <div className="grid grid-cols-2 gap-1 text-xs">
  <div>
  <p className="text-muted-foreground">Type</p>
  <p>{scholarship.type}</p>
  </div>
  <div>
  <p className="text-muted-foreground">Amount</p>
  <p>₱{ss.grantAmount.toLocaleString()}</p>
  </div>
  <div>
  <p className="text-muted-foreground">Award Date</p>
  <p>{new Date(ss.awardDate).toLocaleDateString()}</p>
  </div>
  <div>
  <p className="text-muted-foreground">Term</p>
  <p>{ss.startTerm} - {ss.endTerm}</p>
  </div>
  </div>
  </div>
  </PopoverContent>
  </Popover>
  );
  })
  ) : (
  <span className="text-muted-foreground">None</span>
  )}
  </div>
  </TableCell>
 {isAdmin && (
 <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
 <div className="flex justify-end gap-2">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleEdit(student)}
 className="cursor-pointer zoom-hover"
 >
 <Pencil className="h-4 w-4" />
 </Button>
<Button
  variant="ghost"
  size="icon"
  onClick={() => openDeleteDialog(student)}
  className="text-destructive hover:text-destructive cursor-pointer zoom-hover"
  title="Archive student"
  >
  <Archive className="h-4 w-4" />
  </Button>
 </div>
 </TableCell>
 )}
 </TableRow>
 ))}
 </TableBody>
 </Table>
 )}

 {/* Pagination Controls */}
 {!loading && students.length > 0 && (
 <div className="mt-4 flex items-center justify-between border-t pt-4 px-4 pb-4">
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

 {/* Delete Confirmation Dialog */}
 <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
 <DialogContent>
 <DialogHeader>
 <DialogTitle>Archive Student</DialogTitle>
<DialogDescription>
  Are you sure you want to archive &quot;{deletingStudent?.firstName} {deletingStudent?.lastName}&quot;?
  {deletingStudent?.scholarships && deletingStudent.scholarships.length > 0 && (
  <span className="block mt-2 text-destructive font-medium">
  Warning: This student has {deletingStudent.scholarships.length} scholarship(s) assigned.
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

 {/* Student Detail Dialog - Scholarships First */}
 <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
  <DialogContent className="sm:max-w-5xl md:max-w-6xl lg:max-w-7xl max-h-[90vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle>
 {selectedStudent && `${selectedStudent.firstName} ${selectedStudent.lastName}'s Scholarships`}
 </DialogTitle>
 <DialogDescription>
 View scholarship information and student details
 </DialogDescription>
 </DialogHeader>
 {loadingDetail ? (
 <div className="flex h-48 items-center justify-center">
 <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
 </div>
 ) : selectedStudent ? (
 <div className="space-y-6">
 {/* Scholarships Section - PRIMARY VIEW */}
 <div>
 <h3 className="text-lg font-semibold mb-4">Scholarships</h3>
 {selectedStudent.scholarships && selectedStudent.scholarships.length > 0 ? (
 <div className="space-y-4">
 {selectedStudent.scholarships.map((ss) => {
  const scholarship = ss.scholarship;
  if (!scholarship) return null;

  return (
  <Card key={ss.id} className="border-2" style={{ borderColor: getScholarshipColor(scholarship.scholarshipName) }}>
 <CardContent className="p-4">
 <div className="flex justify-between items-start mb-3">
 <div>
 <h4 className="text-lg font-semibold">{scholarship.scholarshipName}</h4>
 <p className="text-sm text-muted-foreground">{scholarship.type}</p>
 </div>
 <div className="flex gap-2">
 <Badge variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}>
 {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
 </Badge>
 <Badge variant={ss.scholarshipStatus === 'Active' ? 'default' : 'secondary'}>
 {ss.scholarshipStatus}
 </Badge>
 </div>
 </div>
 <div className="grid grid-cols-2 gap-4 text-sm">
 <div>
 <p className="text-muted-foreground">Grant Amount</p>
 <p className="text-lg font-semibold">₱{ss.grantAmount.toLocaleString()}</p>
 </div>
 <div>
 <p className="text-muted-foreground">Award Date</p>
 <p>{new Date(ss.awardDate).toLocaleDateString()}</p>
 </div>
 <div>
 <p className="text-muted-foreground">Start Term</p>
 <p>{ss.startTerm}</p>
 </div>
 <div>
 <p className="text-muted-foreground">End Term</p>
 <p>{ss.endTerm}</p>
 </div>
 </div>
 </CardContent>
 </Card>
  );
 })}
 <div className="mt-4 p-4 bg-primary/10 rounded-lg">
 <p className="text-sm font-medium text-muted-foreground">Total Scholarship Amount</p>
 <p className="text-2xl font-bold">
 ₱{selectedStudent.scholarships.reduce((sum, ss) => sum + Number(ss.grantAmount), 0).toLocaleString()}
 </p>
 </div>
 </div>
 ) : (
 <p className="text-muted-foreground">No scholarships assigned</p>
 )}
 </div>

 {/* Show Full Details Button */}
 <Button 
 variant="outline" 
 className="w-full"
 onClick={() => setShowFullDetails(!showFullDetails)}
 >
 {showFullDetails ? (
 <>
 <ChevronUp className="mr-2 h-4 w-4" />
 Hide Full Details
 </>
 ) : (
 <>
 <ChevronDown className="mr-2 h-4 w-4" />
 Show Full Details
 </>
 )}
 </Button>


 {/* Full Student Details - Hidden by default */}
 {showFullDetails && (
 <>
 {/* Basic Information */}
 <div className="border-t border-gray-200 pt-4">
 <h3 className="text-lg font-semibold mb-4">Student Information</h3>
 <div className="grid grid-cols-2 gap-4">
 <div>
 <p className="text-sm font-medium text-muted-foreground">Full Name</p>
 <p className="text-lg">{selectedStudent.lastName}, {selectedStudent.firstName} {selectedStudent.middleInitial || ''}</p>
 </div>
 <div>
 <p className="text-sm font-medium text-muted-foreground">Status</p>
 <Badge variant={selectedStudent.status === 'Active' ? 'default' : 'secondary'}>
 {selectedStudent.status}
 </Badge>
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
 </div>

 {/* Disbursements */}
 {selectedStudent.disbursements && selectedStudent.disbursements.length > 0 && (
 <div className="border-t border-gray-200 pt-4">
 <h3 className="text-lg font-semibold mb-4">Disbursement History</h3>
 <div className="space-y-2">
 {selectedStudent.disbursements.map((disbursement) => {
  const scholarship = disbursement.scholarship;
  if (!scholarship) return null;

  return (
  <div key={disbursement.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
 <div>
 <p className="font-medium">{scholarship.scholarshipName}</p>
 <p className="text-sm text-muted-foreground">
 {disbursement.term} • {new Date(disbursement.disbursementDate).toLocaleDateString()} • {disbursement.method}
 </p>
 <Badge variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'} className="mt-1">
 {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
 </Badge>
 </div>
 <p className="text-lg font-semibold">₱{disbursement.amount.toLocaleString()}</p>
 </div>
  );
 })}
 </div>
 <div className="mt-4 p-3 bg-primary/10 rounded-lg">
 <p className="text-sm font-medium text-muted-foreground">Total Disbursed</p>
 <p className="text-2xl font-bold">
 ₱{selectedStudent.disbursements.reduce((sum, d) => sum + Number(d.amount), 0).toLocaleString()}
 </p>
 </div>
 </div>
 )}

 {/* Fees Information */}
 <div className="border-t border-gray-200 pt-4">
 <h3 className="text-lg font-semibold mb-4">Fee Information</h3>
 <StudentFeesManager studentId={selectedStudent.id} readOnly={false} />
 </div>
 </>
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


