'use client';

import { useEffect, useState } from 'react';

import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout';
import { ExportButton } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardDetailed } from '@/hooks/use-queries';
import { formatCurrency } from '@/lib/utils';

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
    term: string;
    academicYear: string;
  }>;
}

const GRADE_LEVEL_LABELS: Record<string, string> = {
  GRADE_SCHOOL: 'Grade School',
  JUNIOR_HIGH: 'Junior High',
  SENIOR_HIGH: 'Senior High',
  COLLEGE: 'College',
};

const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];
const SCHOLARSHIP_ACRONYMS = new Set([
  'CHED',
  'CMSP',
  'ESC',
  'LGU',
  'OLSSEF',
  'PAEB',
  'TDP',
  'TES',
  'UTFI',
]);

function formatScholarshipType(type: string) {
  if (type === 'No Scholarship') return type;
  return type
    .split('_')
    .map((part) =>
      SCHOLARSHIP_ACRONYMS.has(part) ? part : `${part[0]}${part.slice(1).toLowerCase()}`
    )
    .join(' ');
}

export default function ReportsPage() {
  const [detailedStudents, setDetailedStudents] = useState<DetailedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [scholarshipNamesByGradeAndType, setScholarshipNamesByGradeAndType] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [scholarshipSourcesByGradeAndType, setScholarshipSourcesByGradeAndType] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
  const [fundingTypeFilter, setFundingTypeFilter] = useState<'all' | 'internal' | 'external'>(
    'all'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  // TanStack Query hook for data fetching
  // staleTime: 0 ensures fresh data is always fetched when this page mounts,
  // so fee/subsidy edits from the student page appear immediately.
  const { data: detailedData, refetch: refetchDetailedView } = useDashboardDetailed(undefined, {
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // Update state when TanStack Query data changes
  useEffect(() => {
    if (detailedData) {
      setDetailedStudents(detailedData.data);
      setLoading(false);

      // Extract unique scholarship names per grade level and type
      const namesByGradeAndType: Record<string, Record<string, Set<string>>> = {};
      const sourcesByGradeAndType: Record<string, Record<string, Set<string>>> = {};

      detailedData.data.forEach((student: DetailedStudent) => {
        const gradeLevel = student.gradeLevel;
        if (!namesByGradeAndType[gradeLevel]) {
          namesByGradeAndType[gradeLevel] = {};
        }
        if (!sourcesByGradeAndType[gradeLevel]) {
          sourcesByGradeAndType[gradeLevel] = {};
        }

        if (!student.scholarships || student.scholarships.length === 0) {
          if (!namesByGradeAndType[gradeLevel]['No Scholarship']) {
            namesByGradeAndType[gradeLevel]['No Scholarship'] = new Set();
          }
          if (!sourcesByGradeAndType[gradeLevel]['No Scholarship']) {
            sourcesByGradeAndType[gradeLevel]['No Scholarship'] = new Set();
          }
          namesByGradeAndType[gradeLevel]['No Scholarship'].add('Unassigned');
        } else {
          student.scholarships.forEach((ss: DetailedStudent['scholarships'][0]) => {
            if (ss.scholarship?.type && ss.scholarship?.scholarshipName) {
              const type = ss.scholarship.type;
              if (!namesByGradeAndType[gradeLevel][type]) {
                namesByGradeAndType[gradeLevel][type] = new Set();
              }
              if (!sourcesByGradeAndType[gradeLevel][type]) {
                sourcesByGradeAndType[gradeLevel][type] = new Set();
              }
              namesByGradeAndType[gradeLevel][type].add(ss.scholarship.scholarshipName);
              if (ss.scholarship.source) {
                sourcesByGradeAndType[gradeLevel][type].add(ss.scholarship.source);
              }
            }
          });
        }
      });

      // Convert Sets to sorted arrays
      const sortedNamesByGradeAndType: Record<string, Record<string, string[]>> = {};
      Object.keys(namesByGradeAndType).forEach((grade) => {
        sortedNamesByGradeAndType[grade] = {};
        Object.keys(namesByGradeAndType[grade]).forEach((type) => {
          sortedNamesByGradeAndType[grade][type] = Array.from(
            namesByGradeAndType[grade][type]
          ).sort();
        });
      });
      setScholarshipNamesByGradeAndType(sortedNamesByGradeAndType);

      const sortedSourcesByGradeAndType: Record<string, Record<string, string[]>> = {};
      Object.keys(sourcesByGradeAndType).forEach((grade) => {
        sortedSourcesByGradeAndType[grade] = {};
        Object.keys(sourcesByGradeAndType[grade]).forEach((type) => {
          sortedSourcesByGradeAndType[grade][type] = Array.from(
            sourcesByGradeAndType[grade][type]
          ).sort();
        });
      });
      setScholarshipSourcesByGradeAndType(sortedSourcesByGradeAndType);
    }
  }, [detailedData]);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchDetailedView();
      toast.success('Reports data refreshed');
    } catch {
      toast.error('Failed to refresh reports');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStudentsByGradeLevelAndScholarship = (gradeLevel: string, scholarshipType: string) => {
    return detailedStudents.filter(
      (s) =>
        s.gradeLevel === gradeLevel &&
        (scholarshipType === 'No Scholarship'
          ? fundingTypeFilter === 'all' && (!s.scholarships || s.scholarships.length === 0)
          : s.scholarships?.some(
              (ss) =>
                ss.scholarship?.type === scholarshipType &&
                scholarshipMatchesFundingFilter(ss.scholarship?.source)
            ))
    );
  };

  // Get scholarship names for a specific grade level and type
  const getScholarshipNames = (gradeLevel: string, scholarshipType: string): string[] => {
    if (fundingTypeFilter === 'all') {
      return scholarshipNamesByGradeAndType[gradeLevel]?.[scholarshipType] || [];
    }

    return Array.from(
      new Set(
        detailedStudents
          .filter((student) => student.gradeLevel === gradeLevel)
          .flatMap((student) => student.scholarships || [])
          .filter(
            (ss) =>
              ss.scholarship?.type === scholarshipType &&
              scholarshipMatchesFundingFilter(ss.scholarship?.source)
          )
          .map((ss) => ss.scholarship?.scholarshipName || '')
          .filter(Boolean)
      )
    ).sort();
  };

  const scholarshipMatchesFundingFilter = (source?: string): boolean => {
    if (fundingTypeFilter === 'all') return true;
    if (fundingTypeFilter === 'internal') return source === 'INTERNAL';
    if (fundingTypeFilter === 'external') return source === 'EXTERNAL';
    return true;
  };

  const filterScholarshipTypes = (gradeLevel: string, types: string[]) => {
    if (fundingTypeFilter === 'all') return types;

    return types.filter((type) =>
      scholarshipSourcesByGradeAndType[gradeLevel]?.[type]?.some((source) =>
        scholarshipMatchesFundingFilter(source)
      )
    );
  };

  const hasMatchingScholarship = (student: DetailedStudent): boolean => {
    if (fundingTypeFilter === 'all') return true;
    if (!student.scholarships || student.scholarships.length === 0) return false;

    return student.scholarships?.some((ss) =>
      scholarshipMatchesFundingFilter(ss.scholarship?.source)
    );
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

  const exportSourceFilter =
    fundingTypeFilter === 'internal'
      ? 'INTERNAL'
      : fundingTypeFilter === 'external'
        ? 'EXTERNAL'
        : '';
  const exportEndpoint = exportSourceFilter
    ? `/api/export/students?source=${exportSourceFilter}`
    : '/api/export/students';

  // Aggregate fees by academic year (sum all semesters)
  const aggregateFeesByAcademicYear = (fees: DetailedStudent['fees']) => {
    if (!fees || fees.length === 0) return null;

    // Group by academic year and sum
    const feesByYear: Record<
      string,
      {
        tuitionFee: number;
        otherFee: number;
        miscellaneousFee: number;
        laboratoryFee: number;
        amountSubsidy: number;
        semesterCount: number;
        academicYear: string;
      }
    > = {};

    fees.forEach((fee) => {
      const year = fee.academicYear || 'Unknown';
      if (!feesByYear[year]) {
        feesByYear[year] = {
          tuitionFee: 0,
          otherFee: 0,
          miscellaneousFee: 0,
          laboratoryFee: 0,
          amountSubsidy: 0,
          semesterCount: 0,
          academicYear: year,
        };
      }
      feesByYear[year].tuitionFee += Number(fee.tuitionFee);
      feesByYear[year].otherFee += Number(fee.otherFee);
      feesByYear[year].miscellaneousFee += Number(fee.miscellaneousFee);
      feesByYear[year].laboratoryFee += Number(fee.laboratoryFee);
      feesByYear[year].amountSubsidy += Number(fee.amountSubsidy);
      feesByYear[year].semesterCount += 1;
    });

    // Return the most recent academic year's aggregated data
    const sortedYears = Object.keys(feesByYear).sort().reverse();
    return feesByYear[sortedYears[0]];
  };

  // Calculate percent subsidy from aggregated annual data
  const calculateAnnualPercentSubsidy = (aggregatedFees: {
    tuitionFee: number;
    otherFee: number;
    miscellaneousFee: number;
    laboratoryFee: number;
    amountSubsidy: number;
  }) => {
    const totalFees =
      Number(aggregatedFees.tuitionFee) +
      Number(aggregatedFees.otherFee) +
      Number(aggregatedFees.miscellaneousFee) +
      Number(aggregatedFees.laboratoryFee);
    return totalFees > 0
      ? Number((Number(aggregatedFees.amountSubsidy) / totalFees).toFixed(4))
      : 0;
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
      <PageHeader title="Reports" description="Detailed student scholarship reports and analytics">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <ExportButton endpoint={exportEndpoint} filename="detailed-student-scholarship-report" />
        </div>
      </PageHeader>

      <Card className="border-gray-200">
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  <CardTitle className="text-foreground">
                    Detailed Student Scholarship Report
                  </CardTitle>
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
            <Tabs
              value={fundingTypeFilter}
              onValueChange={(v) => setFundingTypeFilter(v as 'all' | 'internal' | 'external')}
              className="w-full"
            >
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
                  Internal Funded
                </TabsTrigger>
                <TabsTrigger
                  value="external"
                  className="data-[state=active]:bg-[hsl(var(--pastel-green))] data-[state=active]:text-gray-800 data-[state=inactive]:text-gray-600 transition-all"
                >
                  External Funded
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
              const allScholarshipTypes = Object.keys(
                scholarshipNamesByGradeAndType[gradeLevel] || {}
              ).sort((a, b) => {
                if (a === 'No Scholarship') return 1;
                if (b === 'No Scholarship') return -1;
                return formatScholarshipType(a).localeCompare(formatScholarshipType(b));
              });
              const scholarshipTypes = filterScholarshipTypes(gradeLevel, allScholarshipTypes);

              if (scholarshipTypes.length === 0) return null;

              return (
                <div key={gradeLevel} className="space-y-4">
                  {/* Master Header - Grade Level */}
                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg">
                    <h2 className="text-xl font-bold">{GRADE_LEVEL_LABELS[gradeLevel]}</h2>
                  </div>

                  {/* Subheaders - Scholarship Types with actual scholarship names */}
                  <div className="space-y-6 pl-4">
                    {scholarshipTypes.map((scholarshipType) => {
                      const students = getStudentsByGradeLevelAndScholarship(
                        gradeLevel,
                        scholarshipType
                      );
                      const scholarshipNames = getScholarshipNames(gradeLevel, scholarshipType);

                      if (students.length === 0) return null;

                      return (
                        <div key={scholarshipType} className="space-y-2">
                          <div className="bg-muted px-4 py-2 rounded-md">
                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-muted-foreground">
                                  {scholarshipType === 'No Scholarship'
                                    ? 'No Scholarship'
                                    : `${formatScholarshipType(scholarshipType)} Scholarship`}
                                </h3>
                                {scholarshipNames.length > 0 && (
                                  <p className="text-sm text-muted-foreground">
                                    {scholarshipNames.join(', ')}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className="text-sm">
                                {students.length} student{students.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </div>
                          <div className="overflow-x-auto border border-gray-200 rounded-lg">
                            <Table className="table-fixed min-w-[1000px] text-xs">
                              <colgroup>
                                <col className="w-[110px]" />
                                <col className="w-[110px]" />
                                <col className="w-[50px]" />
                                <col className="w-[80px]" />
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
                                  <TableHead className="font-bold text-right">Tuition</TableHead>
                                  <TableHead className="font-bold text-right">Other Fees</TableHead>
                                  <TableHead className="font-bold text-right">Misc.</TableHead>
                                  <TableHead className="font-bold text-right">Lab</TableHead>
                                  <TableHead className="font-bold text-right">Total Fees</TableHead>
                                  <TableHead className="font-bold text-right">
                                    Amount Subsidy
                                  </TableHead>
                                  <TableHead className="font-bold text-right">% Subsidy</TableHead>
                                  <TableHead className="font-bold text-right">
                                    No. of Students
                                  </TableHead>
                                  <TableHead className="font-bold text-right">FSE</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {students.map((student) => {
                                  // Aggregate all fees by academic year
                                  const aggregatedFees = aggregateFeesByAcademicYear(student.fees);
                                  const totalFees = aggregatedFees
                                    ? Number(aggregatedFees.tuitionFee) +
                                      Number(aggregatedFees.otherFee) +
                                      Number(aggregatedFees.miscellaneousFee) +
                                      Number(aggregatedFees.laboratoryFee)
                                    : 0;
                                  const percentSubsidy = aggregatedFees
                                    ? calculateAnnualPercentSubsidy(aggregatedFees)
                                    : 0;

                                  return (
                                    <TableRow key={student.id}>
                                      <TableCell
                                        className="font-medium truncate"
                                        title={student.lastName}
                                      >
                                        {student.lastName}
                                      </TableCell>
                                      <TableCell className="truncate" title={student.firstName}>
                                        {student.firstName}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {student.middleInitial || '-'}
                                      </TableCell>
                                      <TableCell className="truncate">
                                        {student.yearLevel}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {aggregatedFees
                                          ? formatCurrency(Number(aggregatedFees.tuitionFee))
                                          : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {aggregatedFees
                                          ? formatCurrency(Number(aggregatedFees.otherFee))
                                          : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {aggregatedFees
                                          ? formatCurrency(Number(aggregatedFees.miscellaneousFee))
                                          : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {aggregatedFees
                                          ? formatCurrency(Number(aggregatedFees.laboratoryFee))
                                          : '-'}
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        {formatCurrency(totalFees)}
                                      </TableCell>
                                      <TableCell className="text-right text-green-600 font-semibold">
                                        {aggregatedFees
                                          ? formatCurrency(Number(aggregatedFees.amountSubsidy))
                                          : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Badge variant="secondary" className="text-xs">
                                          {aggregatedFees ? `${percentSubsidy.toFixed(2)}` : '-'}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {aggregatedFees ? (
                                          <div className="flex flex-col items-end gap-1">
                                            <span>1</span>
                                            {aggregatedFees.semesterCount > 1 && (
                                              <Badge
                                                variant="outline"
                                                className="text-[10px] px-1 py-0 h-4"
                                              >
                                                {aggregatedFees.semesterCount} sem
                                              </Badge>
                                            )}
                                          </div>
                                        ) : (
                                          '1'
                                        )}
                                      </TableCell>
                                      <TableCell className="text-right font-semibold">
                                        {aggregatedFees ? `${percentSubsidy.toFixed(2)}` : '-'}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {/* Totals Row */}
                                <TableRow className="bg-muted/50 font-semibold">
                                  <TableCell colSpan={11} className="text-right">
                                    Total
                                  </TableCell>
                                  <TableCell className="text-right">{students.length}</TableCell>
                                  <TableCell className="text-right">
                                    {students
                                      .reduce((sum, s) => {
                                        const aggregatedFees = aggregateFeesByAcademicYear(s.fees);
                                        const percentSubsidy = aggregatedFees
                                          ? calculateAnnualPercentSubsidy(aggregatedFees)
                                          : 0;
                                        const numberOfStudents = 1;
                                        return sum + percentSubsidy * numberOfStudents;
                                      }, 0)
                                      .toFixed(2)}
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
