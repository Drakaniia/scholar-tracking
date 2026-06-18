'use client';

import { useEffect, useMemo, useState } from 'react';

import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/layout';
import { ExportButton, PageHeaderSkeleton } from '@/components/shared';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAcademicYears, useDashboardDetailed } from '@/hooks/use-queries';
import { deriveAcademicYearOptions } from '@/lib/academic-year-utils';
import { formatCurrency } from '@/lib/utils';

interface DetailedStudent {
  id: number;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  gradeLevel: string;
  yearLevel: string;
  scholarships: Array<{
    academicYearId: number | null;
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
    academicYearId: number | null;
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

function ReportsPageSkeleton() {
  return (
    <div>
      <PageHeaderSkeleton actionWidths={['w-24', 'w-36']} />

      <Card className="border-gray-200">
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded-md" />
                  <Skeleton className="h-6 w-72" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {[...Array(4)].map((_, index) => (
                    <Skeleton key={index} className="h-6 w-24 rounded-full" />
                  ))}
                </div>
              </div>
              <Skeleton className="h-10 w-[220px] rounded-md" />
            </div>
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            {[...Array(2)].map((_, gradeIndex) => (
              <div key={gradeIndex} className="space-y-4">
                <Skeleton className="h-12 w-full rounded-lg" />
                <div className="space-y-6 pl-4">
                  {[...Array(2)].map((_, groupIndex) => (
                    <div key={groupIndex} className="space-y-2">
                      <div className="rounded-md bg-muted px-4 py-2">
                        <div className="flex items-center justify-between gap-4">
                          <div className="space-y-2">
                            <Skeleton className="h-6 w-56" />
                            <Skeleton className="h-4 w-80 max-w-full" />
                          </div>
                          <Skeleton className="h-6 w-24 rounded-full" />
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <Table className="table-fixed min-w-[1000px] text-xs">
                          <TableHeader>
                            <TableRow className="bg-muted/50">
                              {[...Array(13)].map((_, columnIndex) => (
                                <TableHead key={columnIndex}>
                                  <Skeleton className="h-4 w-full" />
                                </TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {[...Array(4)].map((_, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {[...Array(13)].map((__, columnIndex) => (
                                  <TableCell key={columnIndex}>
                                    <Skeleton className="h-4 w-full" />
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
  const [academicYearFilter, setAcademicYearFilter] = useState<string>('all');
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
  // Fetch all academic years defined in the system
  const { data: academicYearsData } = useAcademicYears();

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

  // Check if student has data (fees or scholarships) for the selected academic year
  const hasAcademicYearData = (student: DetailedStudent): boolean => {
    if (academicYearFilter === 'all') return true;
    // Check fee records
    if (student.fees?.some((fee) => fee.academicYear === academicYearFilter)) return true;
    // Check scholarship records by academic year ID
    if (student.scholarships?.some((ss) => {
      if (!ss.academicYearId) return false;
      const ayYear = yearById.get(ss.academicYearId);
      return ayYear === academicYearFilter;
    })) return true;
    return false;
  };

  const getStudentsByGradeLevelAndScholarship = (gradeLevel: string, scholarshipType: string) => {
    return detailedStudents.filter(
      (s) =>
        hasAcademicYearData(s) &&
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
    if (fundingTypeFilter === 'all' && academicYearFilter === 'all') {
      return scholarshipNamesByGradeAndType[gradeLevel]?.[scholarshipType] || [];
    }

    return Array.from(
      new Set(
        detailedStudents
          .filter(
            (student) =>
              student.gradeLevel === gradeLevel && hasAcademicYearData(student)
          )
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
    if (fundingTypeFilter === 'all' && academicYearFilter === 'all') return types;

    return types.filter((type) => {
      // Find sources from the filtered student data for this grade level and type
      const matchingSources = detailedStudents
        .filter((s) => s.gradeLevel === gradeLevel && hasAcademicYearData(s))
        .flatMap((s) => s.scholarships || [])
        .filter((ss) => ss.scholarship?.type === type)
        .map((ss) => ss.scholarship?.source)
        .filter(Boolean);

      if (fundingTypeFilter === 'all') return matchingSources.length > 0;
      return matchingSources.some((source) => scholarshipMatchesFundingFilter(source));
    });
  };

  const hasMatchingScholarship = (student: DetailedStudent): boolean => {
    if (!hasAcademicYearData(student)) return false;
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

  // Build academicYearId → year string map from the AcademicYear table
  const yearById = useMemo(() => {
    const map = new Map<number, string>();
    if (academicYearsData?.data) {
      academicYearsData.data.forEach((ay) => {
        if (ay.year) map.set(ay.id, ay.year);
      });
    }
    return map;
  }, [academicYearsData]);

  // Derive academic year options from the AcademicYear table only.
  // This deliberately ignores phantom year strings that may exist in fee data
  // (created by a date-based fallback when no active academic year was configured).
  const academicYearOptions = useMemo(() => {
    const academicYears = (academicYearsData?.data || []) as Array<{ id: number; year: string }>;
    const allFees = detailedStudents.flatMap((s) => s.fees || []);
    return deriveAcademicYearOptions(academicYears, allFees);
  }, [detailedStudents, academicYearsData]);

  const exportSourceFilter =
    fundingTypeFilter === 'internal'
      ? 'INTERNAL'
      : fundingTypeFilter === 'external'
        ? 'EXTERNAL'
        : '';
  const exportEndpoint = exportSourceFilter
    ? `/api/export/students?source=${exportSourceFilter}`
    : '/api/export/students';

  // Aggregate fees by academic year (sum all semesters), returning most recent year.
  // When selectedYear is provided ('all' or specific year), only aggregate fees for that year.
  const aggregateFeesByAcademicYear = (
    fees: DetailedStudent['fees'],
    selectedYear?: string
  ) => {
    if (!fees || fees.length === 0) return null;

    // Filter by selected academic year if specified
    const workingFees =
      selectedYear && selectedYear !== 'all'
        ? fees.filter((fee) => fee.academicYear === selectedYear)
        : fees;

    if (workingFees.length === 0) return null;

    // Group by academic year and return the most recent
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

    workingFees.forEach((fee) => {
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

    const yearsWithData = Object.keys(feesByYear);
    if (yearsWithData.length === 0) return null;

    // Return the most recent academic year's aggregated data
    const sortedYears = yearsWithData.sort().reverse();
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
    return <ReportsPageSkeleton />;
  }

  return (
    <div>
      <PageHeader title="Reports" description="Detailed student scholarship reports and analytics">
        <div className="flex flex-wrap justify-end gap-2">
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
          <ExportButton
            endpoint={exportEndpoint}
            filename="detailed-student-scholarship-report"
            extraItems={[
              {
                endpoint: '/api/export/summary',
                filename: 'scholarship-summary-by-grade-level',
                format: 'xlsx',
                label: 'Summary Excel by Grade Level',
              },
            ]}
          />
        </div>
      </PageHeader>

      <Card className="border-gray-200">
        <CardHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
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
                    return (
                      <Badge
                        key={level}
                        variant={filteredCount === 0 ? 'outline' : 'secondary'}
                        className={`text-sm ${filteredCount === 0 ? 'text-muted-foreground/60' : ''}`}
                      >
                        {GRADE_LEVEL_LABELS[level]}: {filteredCount}
                      </Badge>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={gradeLevelFilter} onValueChange={setGradeLevelFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grade Levels ({getFilteredTotalCount()})</SelectItem>
                    {GRADE_LEVELS.map((level) => {
                      const filteredCount = getFilteredGradeLevelCounts()[level] || 0;
                      return (
                        <SelectItem key={level} value={level}>
                          {GRADE_LEVEL_LABELS[level]} ({filteredCount})
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <Select value={academicYearFilter} onValueChange={setAcademicYearFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Academic Years</SelectItem>
                    {academicYearOptions.map((option) => (
                      <SelectItem key={option.year} value={option.year}>
                        {option.year} ({option.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

              </div>
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

              // Get scholarship types for this grade level from filtered data
              const allScholarshipTypes = [
                ...new Set(
                  detailedStudents
                    .filter((s) => s.gradeLevel === gradeLevel && hasAcademicYearData(s))
                    .flatMap((s) => s.scholarships || [])
                    .map((ss) => ss.scholarship?.type)
                    .filter(Boolean) as string[]
                ),
              ].sort((a, b) => {
                if (a === 'No Scholarship') return 1;
                if (b === 'No Scholarship') return -1;
                return formatScholarshipType(a).localeCompare(formatScholarshipType(b));
              });
              const scholarshipTypes = filterScholarshipTypes(gradeLevel, allScholarshipTypes);

              // Also add 'No Scholarship' if there are unassigned students in the filtered set
              if (
                detailedStudents.some(
                  (s) =>
                    s.gradeLevel === gradeLevel &&
                    hasAcademicYearData(s) &&
                    (!s.scholarships || s.scholarships.length === 0)
                ) &&
                !allScholarshipTypes.includes('No Scholarship')
              ) {
                allScholarshipTypes.push('No Scholarship');
              }

              return (
                <div key={gradeLevel} className="space-y-4">
                  {/* Master Header - Grade Level */}
                  <div className="bg-primary text-primary-foreground px-4 py-3 rounded-lg">
                    <h2 className="text-xl font-bold">{GRADE_LEVEL_LABELS[gradeLevel]}</h2>
                  </div>
                  {scholarshipTypes.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-300 px-6 py-10 text-center">
                      <p className="text-muted-foreground text-sm">No students with scholarships</p>
                    </div>
                  ) : (
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
                                  const aggregatedFees = aggregateFeesByAcademicYear(
                                      student.fees,
                                      academicYearFilter
                                    );
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
                                        const aggregatedFees = aggregateFeesByAcademicYear(
                                          s.fees,
                                          academicYearFilter
                                        );
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
                )}
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
