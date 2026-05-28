'use client';

import { Suspense, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import {
  Award,
  CreditCard,
  FileSpreadsheet,
  Filter,
  GraduationCap,
  Landmark,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

import {
  ChartCardSkeleton,
  PieChartSkeleton,
  RecentAwards,
  RecentAwardsSkeleton,
  ScholarshipChart,
  StatsCard,
  StatsGridSkeleton,
  StudentsChart,
  TabsSkeleton,
} from '@/components/dashboard';
import { ExportButton } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardDetailed, useDashboardStats } from '@/hooks/use-queries';
import { formatCurrency } from '@/lib/utils';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS } from '@/types';

interface DashboardData {
  stats: {
    totalStudents: number;
    studentsWithScholarships: number;
    totalScholarships: number;
    activeScholarships: number;
    totalAmountAwarded: number;
    totalDisbursed: number;
  };
  recentStudents: Array<{
    id: number;
    lastName: string;
    firstName: string;
    middleInitial: string | null;
    gradeLevel: string;
    yearLevel: string;
    scholarships: Array<{
      scholarshipStatus: string;
      scholarship: {
        scholarshipName: string;
        type: string;
      };
    }>;
    updatedAt: string;
  }>;
  charts: {
    studentsByGradeLevel: Array<{
      gradeLevel: string;
      _count: { id: number };
    }>;
    scholarshipsByType: Array<{
      type: string;
      _count: { id: number };
    }>;
    monthlyTrends: Array<{
      name: string;
      awarded: number;
      disbursed: number;
      balance: number;
    }>;
  };
}

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

const SCHOLARSHIP_TYPE_LABELS: Record<string, string> = {
  PAEB: 'PAEB',
  CHED: 'CHED',
  LGU: 'LGU',
  SCHOOL_GRANT: 'School Grant',
};

const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];
const SCHOLARSHIP_TYPES = ['PAEB', 'CHED', 'LGU', 'SCHOOL_GRANT'];
const PASTEL_BAR_COLORS = [
  'hsl(var(--pastel-purple))',
  'hsl(var(--pastel-blue))',
  'hsl(var(--pastel-pink))',
  'hsl(var(--pastel-orange))',
  'hsl(var(--pastel-green))',
];

const HERO_METRIC_TONES = {
  mint: {
    card: 'border-[hsl(var(--pastel-green))] bg-white bg-gradient-to-br from-white via-[hsl(var(--pastel-green))]/24 to-[hsl(var(--pastel-blue))]/16',
    icon: 'bg-[hsl(var(--pastel-green))]/45 text-emerald-800',
  },
  sky: {
    card: 'border-[hsl(var(--pastel-blue))] bg-white bg-gradient-to-br from-white via-[hsl(var(--pastel-blue))]/24 to-[hsl(var(--pastel-purple))]/14',
    icon: 'bg-[hsl(var(--pastel-blue))]/45 text-sky-800',
  },
  peach: {
    card: 'border-[hsl(var(--pastel-orange))] bg-white bg-gradient-to-br from-white via-[hsl(var(--pastel-orange))]/24 to-[hsl(var(--pastel-pink))]/14',
    icon: 'bg-[hsl(var(--pastel-orange))]/45 text-orange-800',
  },
};

function getPercent(numerator: number, denominator: number) {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

function formatPhp(amount: number) {
  return `PHP ${formatCurrency(amount)}`;
}

function formatCompactPhp(amount: number) {
  const compact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);

  return `PHP ${compact}`;
}

function getSourceLabel(source: string) {
  if (source === 'all') return 'All sources';
  return (SCHOLARSHIP_SOURCE_LABELS as Record<string, string>)[source] || source;
}

function getScholarshipTypeLabel(type: string) {
  if (SCHOLARSHIP_TYPE_LABELS[type]) return SCHOLARSHIP_TYPE_LABELS[type];

  return type
    .split('_')
    .map((part) => (part.length <= 4 ? part : `${part[0]}${part.slice(1).toLowerCase()}`))
    .join(' ');
}

function DashboardHero({
  stats,
  scholarshipSourceFilter,
  setScholarshipSourceFilter,
}: {
  stats: DashboardData['stats'];
  scholarshipSourceFilter: string;
  setScholarshipSourceFilter: (value: string) => void;
}) {
  const coverageRate = getPercent(stats.studentsWithScholarships, stats.totalStudents);
  const disbursementRate = getPercent(stats.totalDisbursed, stats.totalAmountAwarded);
  const remainingFunds = Math.max(stats.totalAmountAwarded - stats.totalDisbursed, 0);
  const sourceLabel = getSourceLabel(scholarshipSourceFilter);

  return (
    <section className="relative overflow-hidden rounded-lg border border-[#dce6e1] bg-white bg-gradient-to-br from-[hsl(var(--pastel-green))]/26 via-[hsl(var(--pastel-blue))]/16 to-[hsl(var(--pastel-orange))]/18 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.55),rgba(255,255,255,0)_48%)]" />
      <div className="relative grid gap-5 p-5 lg:grid-cols-[1fr_0.95fr] lg:p-6">
        <div className="flex flex-col justify-between gap-5">
          <div className="space-y-3">
            <Badge
              variant="outline"
              className="border-[hsl(var(--pastel-green))] bg-white text-emerald-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            >
              {sourceLabel}
            </Badge>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-3xl font-bold text-slate-950 md:text-4xl">
                Scholarship command center
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                Coverage, fund release, and recent award movement across the selected scholarship
                source.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={scholarshipSourceFilter} onValueChange={setScholarshipSourceFilter}>
              <SelectTrigger className="h-10 w-full rounded-lg border-emerald-200 bg-white shadow-sm sm:w-[220px]">
                <Filter className="mr-2 h-4 w-4 text-emerald-700" />
                <SelectValue placeholder="Filter by source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SCHOLARSHIP_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>
                    {SCHOLARSHIP_SOURCE_LABELS[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ExportButton
              endpoint="/api/export/summary"
              filename="scholarship-summary-by-grade-level"
              formats={['xlsx']}
              label="Export Summary"
              variant="default"
              className="h-10 rounded-lg bg-gradient-to-r from-emerald-400 via-teal-400 to-sky-400 text-white shadow-[0_12px_28px_rgba(14,165,233,0.22)] hover:from-emerald-500 hover:to-sky-500"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-2">
          <HeroMetric
            label="Student coverage"
            value={`${coverageRate}%`}
            icon={Users}
            tone="mint"
          />
          <HeroMetric
            label="Released funds"
            value={formatPhp(stats.totalDisbursed)}
            icon={Wallet}
            tone="sky"
          />
          <HeroMetric
            label="Remaining funds"
            value={formatPhp(remainingFunds)}
            icon={Landmark}
            tone="peach"
          />
          <div className="rounded-lg border border-[hsl(var(--pastel-green))] bg-white bg-gradient-to-r from-white via-[hsl(var(--pastel-green))]/20 to-[hsl(var(--pastel-blue))]/18 p-3 text-sm text-slate-600 shadow-sm sm:col-span-3 lg:col-span-2">
            <div className="mb-2 flex items-center justify-between">
              <span>Disbursement rate</span>
              <span className="font-semibold text-slate-950">{disbursementRate}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-[hsl(var(--pastel-green))]"
                style={{ width: `${Math.min(disbursementRate, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMetric({
  label,
  value,
  icon: Icon,
  tone = 'mint',
}: {
  label: string;
  value: string;
  icon: typeof Users;
  tone?: keyof typeof HERO_METRIC_TONES;
}) {
  const styles = HERO_METRIC_TONES[tone];

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${styles.card}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${styles.icon}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="text-xl font-bold text-slate-950">{value}</div>
    </div>
  );
}

function StatsSection({ stats }: { stats: DashboardData['stats'] }) {
  const coverageRate = getPercent(stats.studentsWithScholarships, stats.totalStudents);
  const activeRate = getPercent(stats.activeScholarships, stats.totalScholarships);
  const disbursementRate = getPercent(stats.totalDisbursed, stats.totalAmountAwarded);

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatsCard
        title="Total Students"
        value={stats.totalStudents}
        icon={Users}
        description={`${stats.studentsWithScholarships} with scholarships`}
        progress={coverageRate}
        variant="green"
      />
      <StatsCard
        title="Active Programs"
        value={`${stats.activeScholarships}/${stats.totalScholarships}`}
        icon={GraduationCap}
        description={`${activeRate}% active scholarship programs`}
        progress={activeRate}
        variant="blue"
      />
      <StatsCard
        title="Awarded Funds"
        value={formatCompactPhp(stats.totalAmountAwarded)}
        icon={Award}
        description="Committed assistance amount"
        variant="amber"
      />
      <StatsCard
        title="Disbursed Funds"
        value={formatCompactPhp(stats.totalDisbursed)}
        icon={CreditCard}
        description={`${disbursementRate}% of awarded funds released`}
        progress={disbursementRate}
        variant="default"
      />
    </div>
  );
}

function ChartsSection({ data }: { data: DashboardData }) {
  const studentsChartData =
    data?.charts?.studentsByGradeLevel?.map((item) => ({
      name: item.gradeLevel ? GRADE_LEVEL_LABELS[item.gradeLevel] || item.gradeLevel : 'Unassigned',
      students: item._count.id,
    })) || [];

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ScholarshipChart
        title="Fund Movement"
        description="Awarded, disbursed, and remaining balance by month"
        data={data?.charts?.monthlyTrends || []}
      />
      <div className="lg:col-span-1">
        {studentsChartData.length > 0 ? (
          <StudentsChart
            data={studentsChartData}
            title="Student Mix"
            description="Enrollment distribution by level"
          />
        ) : (
          <Card className="rounded-lg border-[#cfe9de] bg-white py-0 shadow-sm">
            <CardContent className="py-10 text-center text-sm text-slate-500">
              No student distribution data
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function SecondaryChartsSection({
  data,
  scholarshipSourceFilter,
}: {
  data: DashboardData;
  scholarshipSourceFilter: string;
}) {
  const sourceLabel = getSourceLabel(scholarshipSourceFilter);
  const scholarshipTypeData =
    data?.charts?.scholarshipsByType
      ?.map((item) => ({
        name: getScholarshipTypeLabel(item.type),
        value: item._count.id,
      }))
      .sort((a, b) => b.value - a.value) || [];
  const otherScholarshipTypes = scholarshipTypeData
    .slice(5)
    .reduce((sum, item) => sum + item.value, 0);
  const scholarshipTypeChartData =
    otherScholarshipTypes > 0
      ? [...scholarshipTypeData.slice(0, 5), { name: 'Other', value: otherScholarshipTypes }]
      : scholarshipTypeData;
  const maxScholarshipTypeCount = Math.max(
    ...scholarshipTypeChartData.map((item) => item.value),
    1
  );

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="rounded-lg border-[#e1e8e4] bg-white py-0 shadow-[0_12px_34px_rgba(15,23,42,0.07)] lg:col-span-1">
        <CardHeader className="px-5 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--pastel-purple))]/45 text-violet-800 shadow-sm">
                <TrendingUp className="h-4 w-4" />
              </span>
              <div>
                <CardTitle className="text-lg text-slate-950">Scholarship Types</CardTitle>
                <CardDescription>{sourceLabel}</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {scholarshipTypeChartData.length > 0 ? (
            <div className="space-y-4">
              {scholarshipTypeChartData.map((item, index) => (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="truncate font-medium text-slate-700">{item.name}</span>
                    <span className="font-semibold text-slate-950">{item.value}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white shadow-inner">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(item.value / maxScholarshipTypeCount) * 100}%`,
                        backgroundColor: PASTEL_BAR_COLORS[index % PASTEL_BAR_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-[#d4dfd9] text-sm text-slate-500">
              No scholarship type data
            </div>
          )}
        </CardContent>
      </Card>
      <div className="lg:col-span-2">
        <RecentAwards
          awards={
            data?.recentStudents?.slice(0, 5).map((student) => ({
              id: student.id,
              studentName: `${student.firstName} ${student.lastName}`,
              scholarshipName:
                student.scholarships?.[0]?.scholarship?.scholarshipName || 'Scholarship Program',
              type: getScholarshipTypeLabel(
                student.scholarships?.[0]?.scholarship?.type || 'Grant'
              ),
              date: student.updatedAt || new Date().toLocaleDateString(),
              status: 'active' as const,
            })) || []
          }
        />
      </div>
    </div>
  );
}

function DetailedView({
  detailedStudents,
  router,
}: {
  detailedStudents: DetailedStudent[];
  router: ReturnType<typeof useRouter>;
}) {
  const getStudentsByGradeLevelAndScholarship = (gradeLevel: string, scholarshipType: string) => {
    return detailedStudents.filter(
      (s) =>
        s.gradeLevel === gradeLevel &&
        s.scholarships?.some((ss) => ss.scholarship?.type === scholarshipType)
    );
  };

  const calculateTotalFees = (fees: DetailedStudent['fees'][0]) => {
    if (!fees) return 0;
    return (
      Number(fees.tuitionFee) +
      Number(fees.otherFee) +
      Number(fees.miscellaneousFee) +
      Number(fees.laboratoryFee)
    );
  };

  const calculatePercentSubsidy = (fees: DetailedStudent['fees'][0]) => {
    if (!fees) return 0;
    const totalFees = calculateTotalFees(fees);
    return totalFees > 0 ? Number((Number(fees.amountSubsidy) / totalFees).toFixed(4)) : 0;
  };

  return (
    <Card className="rounded-lg border-[#cfe9de] bg-white py-0 shadow-[0_12px_34px_rgba(14,165,233,0.08)]">
      <CardHeader className="border-b border-emerald-100 px-5 py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-400 text-white shadow-sm">
              <FileSpreadsheet className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-xl text-slate-950">Detailed Student Report</CardTitle>
              <CardDescription>
                Preview by grade level, scholarship type, and fee coverage.
              </CardDescription>
            </div>
          </div>
          <Button
            onClick={() => router.push('/reports')}
            variant="outline"
            className="rounded-lg border-emerald-200 bg-white hover:bg-emerald-50"
          >
            View Full Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">
        <Tabs defaultValue="GRADE_SCHOOL" className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg bg-gradient-to-r from-emerald-100 via-sky-100 to-amber-100 p-1 sm:grid-cols-4">
            {GRADE_LEVELS.map((level) => (
              <TabsTrigger
                key={level}
                value={level}
                className="rounded-md px-3 py-2 text-slate-600 transition-all data-[state=active]:bg-white data-[state=active]:text-emerald-800 data-[state=active]:shadow-sm"
              >
                {GRADE_LEVEL_LABELS[level]}
              </TabsTrigger>
            ))}
          </TabsList>

          {GRADE_LEVELS.map((gradeLevel) => {
            const groups = SCHOLARSHIP_TYPES.map((scholarshipType) => ({
              scholarshipType,
              students: getStudentsByGradeLevelAndScholarship(gradeLevel, scholarshipType),
            })).filter((group) => group.students.length > 0);

            return (
              <TabsContent key={gradeLevel} value={gradeLevel}>
                {groups.length > 0 ? (
                  <div className="space-y-5">
                    {groups.map(({ scholarshipType, students }) => {
                      const previewStudents = students.slice(0, 3);

                      return (
                        <div key={scholarshipType} className="space-y-3">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-base font-semibold text-slate-800">
                              {getScholarshipTypeLabel(scholarshipType)} Scholarship
                            </h3>
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                              {students.length} students
                            </Badge>
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-emerald-100 bg-white">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-gradient-to-r from-emerald-50 to-sky-50 hover:from-emerald-50 hover:to-sky-50">
                                  <TableHead className="font-semibold text-slate-600">
                                    Last Name
                                  </TableHead>
                                  <TableHead className="font-semibold text-slate-600">
                                    First Name
                                  </TableHead>
                                  <TableHead className="font-semibold text-slate-600">
                                    M.I.
                                  </TableHead>
                                  <TableHead className="font-semibold text-slate-600">
                                    Year Level
                                  </TableHead>
                                  <TableHead className="text-right font-semibold text-slate-600">
                                    Total Fees
                                  </TableHead>
                                  <TableHead className="text-right font-semibold text-slate-600">
                                    Subsidy
                                  </TableHead>
                                  <TableHead className="text-right font-semibold text-slate-600">
                                    Coverage
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {previewStudents.map((student) => {
                                  const fees = student.fees[0];
                                  const totalFees = fees ? calculateTotalFees(fees) : 0;

                                  return (
                                    <TableRow key={student.id} className="hover:bg-emerald-50/60">
                                      <TableCell className="font-medium text-slate-950">
                                        {student.lastName}
                                      </TableCell>
                                      <TableCell>{student.firstName}</TableCell>
                                      <TableCell>{student.middleInitial || '-'}</TableCell>
                                      <TableCell>{student.yearLevel}</TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(totalFees)}
                                      </TableCell>
                                      <TableCell className="text-right font-medium text-emerald-700">
                                        {fees ? formatCurrency(Number(fees.amountSubsidy)) : '-'}
                                      </TableCell>
                                      <TableCell className="text-right">
                                        <Badge
                                          variant="secondary"
                                          className="bg-sky-50 text-sky-700"
                                        >
                                          {fees
                                            ? `${(calculatePercentSubsidy(fees) * 100).toFixed(2)}%`
                                            : '-'}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                                {students.length > 3 && (
                                  <TableRow>
                                    <TableCell
                                      colSpan={7}
                                      className="py-4 text-center text-sm text-slate-500"
                                    >
                                      {students.length - 3} more students available in the full
                                      report.
                                    </TableCell>
                                  </TableRow>
                                )}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex min-h-[180px] items-center justify-center rounded-lg border border-dashed border-[#d4dfd9] bg-slate-50/70 text-sm text-slate-500">
                    No students match this grade and scholarship source.
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-lg border border-[#dce6e1] bg-white p-6 text-center shadow-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
        <p className="text-sm text-slate-600">Loading dashboard...</p>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scholarshipSourceFilter, setScholarshipSourceFilter] = useState<string>(
    searchParams.get('source') || 'all'
  );

  const { data: statsData, isLoading: statsLoading } = useDashboardStats(scholarshipSourceFilter, {
    staleTime: 5 * 60 * 1000,
  });
  const statsLoaded = !!statsData?.data;
  const {
    data: detailedData,
    isLoading: detailedLoading,
    isFetching: detailedFetching,
    isError: detailedError,
  } = useDashboardDetailed(scholarshipSourceFilter, {
    enabled: statsLoaded,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = statsLoading;
  const data = statsData?.data;
  const detailedStudents = detailedData?.data || [];
  const showDetailedSkeleton =
    !detailedData && !detailedError && (detailedLoading || detailedFetching);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="rounded-lg border border-[#dce6e1] bg-white p-6 text-center shadow-sm">
          <p className="mb-4 text-sm text-slate-600">Failed to load dashboard data</p>
          <Button onClick={() => window.location.reload()} className="rounded-lg">
            Reload Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const stats = data?.stats || {
    totalStudents: 0,
    studentsWithScholarships: 0,
    totalScholarships: 0,
    activeScholarships: 0,
    totalAmountAwarded: 0,
    totalDisbursed: 0,
  };

  return (
    <div className="space-y-5">
      <DashboardHero
        stats={stats}
        scholarshipSourceFilter={scholarshipSourceFilter}
        setScholarshipSourceFilter={setScholarshipSourceFilter}
      />

      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsSection stats={stats} />
      </Suspense>

      <Suspense fallback={<ChartCardSkeleton />}>
        <ChartsSection data={data} />
      </Suspense>

      <Suspense
        fallback={
          <div className="grid gap-5 lg:grid-cols-3">
            <PieChartSkeleton />
            <RecentAwardsSkeleton />
          </div>
        }
      >
        <SecondaryChartsSection data={data} scholarshipSourceFilter={scholarshipSourceFilter} />
      </Suspense>

      {showDetailedSkeleton ? (
        <TabsSkeleton />
      ) : (
        <Suspense fallback={<TabsSkeleton />}>
          <DetailedView detailedStudents={detailedStudents} router={router} />
        </Suspense>
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <DashboardContent />
    </Suspense>
  );
}
