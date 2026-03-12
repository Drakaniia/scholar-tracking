'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout';
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
import { FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { ExportButton } from '@/components/shared';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface DetailedStudent {
 id: number;
 lastName: string;
 firstName: string;
 middleInitial: string | null;
 gradeLevel: string;
 yearLevel: string;
 scholarships: Array<{
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
 }>;
}

const GRADE_LEVEL_LABELS: Record<string, string> = {
 GRADE_SCHOOL: 'Grade School',
 JUNIOR_HIGH: 'Junior High',
 SENIOR_HIGH: 'Senior High',
 COLLEGE: 'College',
};

const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];

export default function ReportsPage() {
 const [detailedStudents, setDetailedStudents] = useState<DetailedStudent[]>([]);
 const [loading, setLoading] = useState(true);
 const [scholarshipTypesByGrade, setScholarshipTypesByGrade] = useState<Record<string, string[]>>({});
 const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
 const [fundingTypeFilter, setFundingTypeFilter] = useState<'all' | 'internal' | 'external'>('all');

 useEffect(() => {
 fetchDetailedView();
 }, []);

 const fetchDetailedView = async () => {
 try {
 const res = await fetch('/api/dashboard/detailed');
 const json = await res.json();

 if (json.success) {
 setDetailedStudents(json.data);

 // Extract unique scholarship types per grade level
 const typesByGrade: Record<string, Set<string>> = {};

 json.data.forEach((student: DetailedStudent) => {
 if (!typesByGrade[student.gradeLevel]) {
 typesByGrade[student.gradeLevel] = new Set();
 }

 student.scholarships.forEach((ss: DetailedStudent['scholarships'][0]) => {
 if (ss.scholarship?.type) {
 typesByGrade[student.gradeLevel].add(ss.scholarship.type);
 }
 });
 });

 // Convert Sets to sorted arrays
 const sortedTypesByGrade: Record<string, string[]> = {};
 Object.keys(typesByGrade).forEach((grade) => {
 sortedTypesByGrade[grade] = Array.from(typesByGrade[grade]).sort();
 });
 setScholarshipTypesByGrade(sortedTypesByGrade);
 }
 } catch (error) {
 console.error('Error fetching detailed view:', error);
 } finally {
 setLoading(false);
 }
 };

 const getStudentsByGradeLevelAndScholarship = (gradeLevel: string, scholarshipType: string) => {
 return detailedStudents.filter(
 (s) => s.gradeLevel === gradeLevel && s.scholarships?.some(ss => ss.scholarship?.type === scholarshipType)
 );
 };

 const isInternalScholarship = (scholarshipType: string): boolean => {
 return scholarshipType === 'SCHOOL_GRANT';
 };

 const isExternalScholarship = (scholarshipType: string): boolean => {
 return ['PAED', 'CHED', 'LGU'].includes(scholarshipType);
 };

 const filterScholarshipTypes = (types: string[]) => {
 if (fundingTypeFilter === 'all') return types;
 if (fundingTypeFilter === 'internal') {
 return types.filter(type => isInternalScholarship(type));
 }
 if (fundingTypeFilter === 'external') {
 return types.filter(type => isExternalScholarship(type));
 }
 return types;
 };

 const hasMatchingScholarship = (student: DetailedStudent): boolean => {
 if (fundingTypeFilter === 'all') return true;
 if (fundingTypeFilter === 'internal') {
 return student.scholarships?.some(ss => isInternalScholarship(ss.scholarship?.type));
 }
 if (fundingTypeFilter === 'external') {
 return student.scholarships?.some(ss => isExternalScholarship(ss.scholarship?.type));
 }
 return true;
 };

 const getFilteredGradeLevelCounts = (): Record<string, number> => {
 const counts: Record<string, number> = {};
 GRADE_LEVELS.forEach((level) => {
 counts[level] = detailedStudents.filter(
 (s) => s.gradeLevel === level && hasMatchingScholarship(s)
 ).length;
 });
 return counts;
 };

 const getFilteredTotalCount = (): number => {
 return detailedStudents.filter((s) => hasMatchingScholarship(s)).length;
 };

 const calculateTotalFees = (fees: DetailedStudent['fees'][0]) => {
 if (!fees) return 0;
 return Number(fees.tuitionFee) + Number(fees.otherFee) +
 Number(fees.miscellaneousFee) + Number(fees.laboratoryFee);
 };

 const calculatePercentSubsidy = (fees: DetailedStudent['fees'][0]) => {
 if (!fees) return 0;
 const totalFees = calculateTotalFees(fees);
 return totalFees > 0 ? (Number(fees.amountSubsidy) / totalFees) * 100 : 0;
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
 title="Reports"
 description="Detailed student scholarship reports and analytics"
 >
 <ExportButton endpoint="/api/export/students" filename="detailed-student-scholarship-report" />
 </PageHeader>

 <Card className="border-gray-200">
 <CardHeader>
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-2">
 <FileSpreadsheet className="h-5 w-5 text-primary" />
 <CardTitle className="text-foreground">Detailed Student Scholarship Report</CardTitle>
 </div>
 <div className="flex items-center gap-2">
 <Badge variant="outline" className="text-sm">
 Total: {getFilteredTotalCount()}
 </Badge>
 {GRADE_LEVELS.map((level) => {
 const filteredCount = getFilteredGradeLevelCounts()[level] || 0;
 if (filteredCount === 0) return null;
 return (
 <Badge key={level} variant="secondary" className="text-sm">
 {GRADE_LEVEL_LABELS[level]}: {filteredCount}
 </Badge>
 );
 })}
 </div>
 </div>
 <Select value={gradeLevelFilter} onValueChange={setGradeLevelFilter}>
 <SelectTrigger className="w-[220px]">
 <SelectValue placeholder="Filter by grade level" />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="all">All Grade Levels ({getFilteredTotalCount()})</SelectItem>
 {GRADE_LEVELS.map((level) => {
 const filteredCount = getFilteredGradeLevelCounts()[level] || 0;
 if (filteredCount === 0) return null;
 return (
 <SelectItem key={level} value={level}>
 {GRADE_LEVEL_LABELS[level]} ({filteredCount})
 </SelectItem>
 );
 })}
 </SelectContent>
 </Select>
 </div>
 
 {/* Centered Toggle Buttons - Stretched */}
 <Tabs value={fundingTypeFilter} onValueChange={(v) => setFundingTypeFilter(v as 'all' | 'internal' | 'external')} className="w-full">
 <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 h-auto">
 <TabsTrigger
 value="all"
 className="data-[state=active]:bg-[hsl(var(--pastel-purple))] data-[state=active]:text-gray-800 data-[state=inactive]:text-gray-600 transition-all"
 >
 All Scholarships
 </TabsTrigger>
 <TabsTrigger
 value="internal"
 className="data-[state=active]:bg-[hsl(var(--pastel-blue))] data-[state=active]:text-gray-800 data-[state=inactive]:text-gray-600 transition-all"
 >
 Internally Funded
 </TabsTrigger>
 <TabsTrigger
 value="external"
 className="data-[state=active]:bg-[hsl(var(--pastel-green))] data-[state=active]:text-gray-800 data-[state=inactive]:text-gray-600 transition-all"
 >
 Externally Funded
 </TabsTrigger>
 </TabsList>
 </Tabs>
 </div>
 </CardHeader>
 <CardContent>
 <div className="space-y-8">
 {GRADE_LEVELS.map((gradeLevel) => {
 // Apply filter
 if (gradeLevelFilter !== 'all' && gradeLevelFilter !== gradeLevel) {
 return null;
 }

 // Get scholarship types for this grade level and apply funding filter
 const allScholarshipTypes = scholarshipTypesByGrade[gradeLevel] || [];
 const scholarshipTypes = filterScholarshipTypes(allScholarshipTypes);

 if (scholarshipTypes.length === 0) return null;

 return (
 <div key={gradeLevel} className="space-y-4">
 {/* Master Header - Grade Level */}
 <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg">
 <h2 className="text-xl font-bold">{GRADE_LEVEL_LABELS[gradeLevel]}</h2>
 </div>

 {/* Subheaders - Scholarship Types */}
 <div className="space-y-6 pl-4">
 {scholarshipTypes.map((scholarshipType) => {
 const students = getStudentsByGradeLevelAndScholarship(gradeLevel, scholarshipType);
 
 if (students.length === 0) return null;

 return (
 <div key={scholarshipType} className="space-y-2">
 <div className="bg-muted px-4 py-2 rounded-md">
 <h3 className="text-lg font-semibold text-muted-foreground">
 {scholarshipType} Scholarship
 </h3>
 </div>
 <div className="overflow-x-auto border border-gray-200 rounded-lg">
 <Table className="table-fixed min-w-[1150px] text-xs">
 <colgroup>
 <col className="w-[110px]" />
 <col className="w-[110px]" />
 <col className="w-[50px]" />
 <col className="w-[80px]" />
 <col className="w-[160px]" />
 <col className="w-[75px]" />
 <col className="w-[75px]" />
 <col className="w-[65px]" />
 <col className="w-[65px]" />
 <col className="w-[80px]" />
 <col className="w-[90px]" />
 <col className="w-[75px]" />
 <col className="w-[60px]" />
 <col className="w-[75px]" />
 </colgroup>
 <TableHeader>
 <TableRow className="bg-muted/50">
 <TableHead className="font-bold">Last Name</TableHead>
 <TableHead className="font-bold">First Name</TableHead>
 <TableHead className="font-bold">M.I.</TableHead>
 <TableHead className="font-bold">Year Level</TableHead>
 <TableHead className="font-bold">Scholarships</TableHead>
 <TableHead className="font-bold text-right">Tuition</TableHead>
 <TableHead className="font-bold text-right">Other Fees</TableHead>
 <TableHead className="font-bold text-right">Misc.</TableHead>
 <TableHead className="font-bold text-right">Lab</TableHead>
 <TableHead className="font-bold text-right">Total Fees</TableHead>
 <TableHead className="font-bold text-right">Amount Subsidy</TableHead>
 <TableHead className="font-bold text-right">% Subsidy</TableHead>
 <TableHead className="font-bold text-right">No. of Students</TableHead>
 <TableHead className="font-bold text-right">EFC</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {students.map((student) => {
 const fees = student.fees[0];
 const totalFees = fees ? calculateTotalFees(fees) : 0;
 const scholarshipNames = student.scholarships.map(ss => ss.scholarship.scholarshipName).join(', ');

 return (
 <TableRow key={student.id}>
 <TableCell className="font-medium truncate" title={student.lastName}>{student.lastName}</TableCell>
 <TableCell className="truncate" title={student.firstName}>{student.firstName}</TableCell>
 <TableCell className="text-center">{student.middleInitial || '-'}</TableCell>
 <TableCell className="truncate">{student.yearLevel}</TableCell>
 <TableCell className="truncate" title={scholarshipNames}>
 {scholarshipNames}
 </TableCell>
 <TableCell className="text-right">
 {fees ? formatCurrency(Number(fees.tuitionFee)) : '-'}
 </TableCell>
 <TableCell className="text-right">
 {fees ? formatCurrency(Number(fees.otherFee)) : '-'}
 </TableCell>
 <TableCell className="text-right">
 {fees ? formatCurrency(Number(fees.miscellaneousFee)) : '-'}
 </TableCell>
 <TableCell className="text-right">
 {fees ? formatCurrency(Number(fees.laboratoryFee)) : '-'}
 </TableCell>
 <TableCell className="text-right font-semibold">
 {formatCurrency(totalFees)}
 </TableCell>
 <TableCell className="text-right text-green-600 font-semibold">
 {fees ? formatCurrency(Number(fees.amountSubsidy)) : '-'}
 </TableCell>
 <TableCell className="text-right">
 <Badge variant="secondary" className="text-xs">
 {fees ? `${calculatePercentSubsidy(fees).toFixed(2)}%` : '-'}
 </Badge>
 </TableCell>
 <TableCell className="text-right">
 1
 </TableCell>
 <TableCell className="text-right font-semibold">
 {/* EFC = % Subsidy × No. of Students */}
 {fees ? `${(calculatePercentSubsidy(fees) * 1).toFixed(2)}%` : '-'}
 </TableCell>
 </TableRow>
 );
 })}
 {/* Totals Row */}
 <TableRow className="bg-muted/50 font-semibold">
 <TableCell colSpan={12} className="text-right">Total</TableCell>
 <TableCell className="text-right">
 {students.length}
 </TableCell>
 <TableCell className="text-right">
 {/* Total EFC = Sum of (% Subsidy × No. of Students) for all students */}
 {students.reduce((sum, s) => {
 const fees = s.fees[0];
 const percentSubsidy = fees ? calculatePercentSubsidy(fees) : 0;
 const numberOfStudents = 1; // Each row represents 1 student
 return sum + (percentSubsidy * numberOfStudents);
 }, 0).toFixed(2)}%
 </TableCell>
 </TableRow>
 </TableBody>
 </Table>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 );
 })}

 {detailedStudents.length === 0 && (
 <div className="text-center py-12 text-muted-foreground">
 No students with scholarships found
 </div>
 )}
 </div>
 </CardContent>
 </Card>
 </div>
 );
}
