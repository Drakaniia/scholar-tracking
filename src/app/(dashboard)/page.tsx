'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import backgroundImage from '@/assets/images/background2.jpg';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Users,
  GraduationCap,
  Award,
  FileSpreadsheet,
  TrendingUp,
  Download,
  Filter,
  CreditCard,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  StatsCard,
  ScholarshipChart,
  StudentsChart,
  RecentAwards,
  StatsGridSkeleton,
  ChartCardSkeleton,
  PieChartSkeleton,
  RecentAwardsSkeleton,
  TabsSkeleton,
} from '@/components/dashboard';
import { CustomPieChart } from '@/components/charts';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS } from '@/types';
import { prefetchEndpoints } from '@/lib/cache';
import { useDashboardStats, useDashboardDetailed } from '@/hooks/use-queries';

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

const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];
const SCHOLARSHIP_TYPES = ['PAEB', 'CHED', 'LGU', 'SCHOOL_GRANT'];

// Stats Section Component
function StatsSection({ stats }: { stats: DashboardData['stats'] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Total Scholarships"
        value={stats.totalScholarships}
        icon={GraduationCap}
        trend={{ value: 12.5, isPositive: true }}
        description="Active programs"
        variant="blue"
      />
      <StatsCard
        title="Total Students"
        value={stats.totalStudents}
        icon={Users}
        trend={{ value: 8.2, isPositive: true }}
        description={`${stats.studentsWithScholarships} with scholarships`}
        variant="pink"
      />
      <StatsCard
        title="Total Awarded"
        value={formatCurrency(stats.totalAmountAwarded)}
        icon={Award}
        trend={{ value: 2.1, isPositive: true }}
        description="Available funds"
        variant="orange"
      />
      <StatsCard
        title="Total Disbursed"
        value={formatCurrency(stats.totalDisbursed)}
        icon={CreditCard}
        trend={{ value: 18.7, isPositive: true }}
        description="Total distributed"
        variant="green"
      />
    </div>
  );
}

// Charts Section Component
function ChartsSection({ data }: { data: DashboardData }) {
  const studentsChartData = data?.charts?.studentsByGradeLevel?.map(item => ({
    name: GRADE_LEVEL_LABELS[item.gradeLevel] || item.gradeLevel,
    students: item._count.id,
    withScholarship: Math.floor(item._count.id * 0.4),
  })) || [];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ScholarshipChart
        title="Scholarship Trends"
        description="Monthly awarded, disbursed, and remaining balance"
        data={data?.charts?.monthlyTrends || []}
      />
      <div className="lg:col-span-1">
        {studentsChartData.length > 0 && (
          <StudentsChart
            data={studentsChartData}
            title="Students by Grade"
            description="Distribution of students"
          />
        )}
      </div>
    </div>
  );
}

// Secondary Charts Component
function SecondaryChartsSection({ data, scholarshipSourceFilter }: { 
  data: DashboardData; 
  scholarshipSourceFilter: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="lg:col-span-1 border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-foreground">Scholarships by Type</CardTitle>
            </div>
          </div>
          <CardDescription>Distribution by type</CardDescription>
        </CardHeader>
        <CardContent>
          {data?.charts?.scholarshipsByType && data.charts.scholarshipsByType.length > 0 ? (
            <CustomPieChart
              key={scholarshipSourceFilter}
              data={data.charts.scholarshipsByType.map(item => ({
                name: item.type,
                value: item._count.id
              }))}
            />
          ) : (
            <p className="text-center text-muted-foreground py-8">No data available</p>
          )}
        </CardContent>
      </Card>
      <div className="lg:col-span-2">
        <RecentAwards 
          awards={data?.recentStudents?.slice(0, 5).map((student, index) => ({
            id: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            scholarshipName: student.scholarships?.[0]?.scholarship?.scholarshipName || 'Scholarship Program',
            type: student.scholarships?.[0]?.scholarship?.type || 'GRANT',
            amount: 25000 + (index * 5000),
            date: student.updatedAt || new Date().toLocaleDateString(),
            status: 'active' as const,
          })) || []}
        />
      </div>
    </div>
  );
}

// Detailed View Component
function DetailedView({
  detailedStudents,
  router
}: {
  detailedStudents: DetailedStudent[];
  router: ReturnType<typeof useRouter>;
}) {
  const getStudentsByGradeLevelAndScholarship = (gradeLevel: string, scholarshipType: string) => {
    return detailedStudents.filter(
      (s) => s.gradeLevel === gradeLevel && s.scholarships?.some(ss => ss.scholarship?.type === scholarshipType)
    );
  };

  const calculateTotalFees = (fees: DetailedStudent['fees'][0]) => {
    if (!fees) return 0;
    return Number(fees.tuitionFee) + Number(fees.otherFee) +
      Number(fees.miscellaneousFee) + Number(fees.laboratoryFee);
  };

  return (
    <Card className="border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-foreground">Detailed Student Report</CardTitle>
              <CardDescription>Complete breakdown by grade level and scholarship type</CardDescription>
            </div>
          </div>
          <Button
            onClick={() => router.push('/reports')}
            variant="outline"
          >
            View Full Report
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Tabs defaultValue="GRADE_SCHOOL" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 h-auto">
              {GRADE_LEVELS.map((level) => (
                <TabsTrigger
                  key={level}
                  value={level}
                  className="data-[state=active]:bg-[hsl(var(--pastel-purple))] data-[state=active]:text-gray-800 data-[state=inactive]:text-gray-600 transition-all"
                >
                  {GRADE_LEVEL_LABELS[level]}
                </TabsTrigger>
              ))}
            </TabsList>

            {GRADE_LEVELS.map((gradeLevel) => (
              <TabsContent key={gradeLevel} value={gradeLevel}>
                <div className="space-y-6">
                  {SCHOLARSHIP_TYPES.map((scholarshipType) => {
                    const students = getStudentsByGradeLevelAndScholarship(gradeLevel, scholarshipType);
                    if (students.length === 0) return null;

                    const previewStudents = students.slice(0, 3);

                    return (
                      <div key={scholarshipType} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-muted-foreground">
                            {scholarshipType} Scholarship
                          </h3>
                          <Badge variant="secondary">{students.length} students</Badge>
                        </div>
                        <div className="overflow-x-auto border border-gray-200 rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/50">
                                <TableHead className="font-bold">Last Name</TableHead>
                                <TableHead className="font-bold">First Name</TableHead>
                                <TableHead className="font-bold">M.I.</TableHead>
                                <TableHead className="font-bold">Year Level</TableHead>
                                <TableHead className="font-bold text-right">Total Fees</TableHead>
                                <TableHead className="font-bold text-right">Subsidy</TableHead>
                                <TableHead className="font-bold text-right">% Subsidy</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {previewStudents.map((student) => {
                                const fees = student.fees[0];
                                const totalFees = fees ? calculateTotalFees(fees) : 0;

                                return (
                                  <TableRow key={student.id} className="hover:bg-muted/30 transition-colors">
                                    <TableCell className="font-medium">{student.lastName}</TableCell>
                                    <TableCell>{student.firstName}</TableCell>
                                    <TableCell>{student.middleInitial || '-'}</TableCell>
                                    <TableCell>{student.yearLevel}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                      {formatCurrency(totalFees)}
                                    </TableCell>
                                    <TableCell className="text-right text-emerald-600 font-semibold">
                                      {fees ? formatCurrency(Number(fees.amountSubsidy)) : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Badge variant="secondary" className="bg-primary/10 text-primary">
                                        {fees ? `${Number(fees.percentSubsidy).toFixed(2)}%` : '-'}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {students.length > 3 && (
                                <TableRow>
                                  <TableCell colSpan={7} className="text-center text-muted-foreground py-4">
                                    ... and {students.length - 3} more students. View full report for complete details.
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
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Content
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [scholarshipSourceFilter, setScholarshipSourceFilter] = useState<string>(
    searchParams.get('source') || 'all'
  );
  
  // Use TanStack Query for data fetching
  const { data: statsData, isLoading: statsLoading } = useDashboardStats(
    scholarshipSourceFilter,
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: true,
    }
  );
  const { data: detailedData, isLoading: detailedLoading } = useDashboardDetailed(
    scholarshipSourceFilter,
    {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: true,
    }
  );
  
  const isLoading = statsLoading || detailedLoading;
  const data = statsData?.data;
  const detailedStudents = detailedData?.data || [];

  useEffect(() => {
    const prefetchAllPages = async () => {
      await prefetchEndpoints([
        '/api/students?limit=100',
        '/api/scholarships',
        '/api/dashboard/detailed',
        '/api/users',
      ]);
    };

    const timer = setTimeout(prefetchAllPages, 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Failed to load dashboard data</p>
          <Button onClick={() => router.push('/loading')} variant="gradient">
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
    <div className="space-y-6">
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border-t-4 border-t-[#22c55e] shadow-sm overflow-hidden">
        {/* Background image positioned on the right, mirrored */}
        <div className="absolute inset-y-0 right-0 w-1/2">
          <Image
            src={backgroundImage}
            alt="Background"
            fill
            className="object-cover -scale-x-100 opacity-60"
            priority
          />
        </div>

        {/* Smooth gradient fade from image to white on the left */}
        <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-transparent via-white/20 to-white" />

        {/* Content with relative positioning to stay above background */}
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-gray-800">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here&apos;s an overview of your scholarship programs.
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-2">
          <Select value={scholarshipSourceFilter} onValueChange={setScholarshipSourceFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
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
          <Button asChild variant="gradient">
            <Link href="/reports">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<StatsGridSkeleton />}>
        <StatsSection stats={stats} />
      </Suspense>

      <Suspense fallback={<ChartCardSkeleton />}>
        <ChartsSection data={data} />
      </Suspense>

      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <PieChartSkeleton />
          <RecentAwardsSkeleton />
        </div>
      }>
        <SecondaryChartsSection data={data} scholarshipSourceFilter={scholarshipSourceFilter} />
      </Suspense>

      <Suspense fallback={<TabsSkeleton />}>
        <DetailedView
          detailedStudents={detailedStudents}
          router={router}
        />
      </Suspense>
    </div>
  );
}

// Export default with Suspense boundary at the top level
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
