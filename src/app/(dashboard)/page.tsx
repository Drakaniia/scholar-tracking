'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
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
// import { ThemeToggle } from '@/components/theme-toggle';
import {
  StatsCard,
  ScholarshipChart,
  StudentsChart,
  RecentAwards,
  // ScholarshipOverview,
  DashboardSkeleton,
} from '@/components/dashboard';
import { CustomPieChart } from '@/components/charts';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS } from '@/types';
import { fetchWithCache, prefetchEndpoints } from '@/lib/cache';

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
    studentNo: string;
    lastName: string;
    firstName: string;
    middleInitial: string | null;
    gradeLevel: string;
    yearLevel: string;
    scholarshipStatus: string | null;
    scholarship: {
      scholarshipName: string;
      type: string;
    } | null;
    awardDate: string | null;
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
  };
}

interface DetailedStudent {
  id: number;
  studentNo: string;
  lastName: string;
  firstName: string;
  middleInitial: string | null;
  gradeLevel: string;
  yearLevel: string;
  scholarship: {
    scholarshipName: string;
    type: string;
  } | null;
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

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [detailedStudents, setDetailedStudents] = useState<DetailedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [scholarshipSourceFilter, setScholarshipSourceFilter] = useState<string>('all');
  const [isVisible, setIsVisible] = useState(false);

  // Trigger fade-in animation after component mounts
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Prefetch all pages in the background for instant navigation
  useEffect(() => {
    const prefetchAllPages = async () => {
      await prefetchEndpoints([
        '/api/students?limit=100',
        '/api/scholarships',
        '/api/dashboard/detailed',
        '/api/users',
      ]);
      console.log('✓ All pages prefetched for instant navigation');
    };

    const timer = setTimeout(prefetchAllPages, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const params = new URLSearchParams();
        if (scholarshipSourceFilter && scholarshipSourceFilter !== 'all') {
          params.append('source', scholarshipSourceFilter);
        }

        const url = `/api/dashboard?${params}`;
        const json = await fetchWithCache<{ success: boolean; data: DashboardData }>(
          url,
          undefined,
          5 * 60 * 1000
        );

        if (json.success) {
          setData(json.data);
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [scholarshipSourceFilter]);

  useEffect(() => {
    async function fetchDetailedView() {
      try {
        const url = '/api/dashboard/detailed';
        const json = await fetchWithCache<{ success: boolean; data: DetailedStudent[] }>(
          url,
          undefined,
          5 * 60 * 1000
        );

        if (json.success) {
          setDetailedStudents(json.data);
        }
      } catch (error) {
        console.error('Error fetching detailed view:', error);
      } finally {
        setLoadingDetails(false);
      }
    }
    fetchDetailedView();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const stats = data?.stats || {
    totalStudents: 0,
    studentsWithScholarships: 0,
    totalScholarships: 0,
    activeScholarships: 0,
    totalAmountAwarded: 0,
    totalDisbursed: 0,
  };

  // Prepare chart data
  const studentsChartData = data?.charts?.studentsByGradeLevel?.map(item => ({
    name: GRADE_LEVEL_LABELS[item.gradeLevel] || item.gradeLevel,
    students: item._count.id,
    withScholarship: Math.floor(item._count.id * 0.4), // Mock ratio
  })) || [];

  const recentAwards = data?.recentStudents?.slice(0, 5).map((student, index) => ({
    id: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    scholarshipName: student.scholarship?.scholarshipName || 'Scholarship Program',
    type: student.scholarship?.type || 'GRANT',
    amount: 25000 + (index * 5000),
    date: student.awardDate || new Date().toLocaleDateString(),
    status: 'active' as const,
  })) || [];

  const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];
  const SCHOLARSHIP_TYPES = ['PAEB', 'CHED', 'LGU', 'SCHOOL_GRANT'];

  const getStudentsByGradeLevelAndScholarship = (gradeLevel: string, scholarshipType: string) => {
    return detailedStudents.filter(
      (s) => s.gradeLevel === gradeLevel && s.scholarship?.type === scholarshipType
    );
  };

  const calculateTotalFees = (fees: DetailedStudent['fees'][0]) => {
    if (!fees) return 0;
    return Number(fees.tuitionFee) + Number(fees.otherFee) +
      Number(fees.miscellaneousFee) + Number(fees.laboratoryFee);
  };

  return (
    <div className="space-y-6">
      {/* Page Header - Enhanced Style */}
      <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white dark:bg-gray-900 p-6 rounded-xl transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back! Here&apos;s an overview of your scholarship programs.
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Stats Cards Grid - Enhanced with StatsCard component */}
      {/* Stats Cards Grid - Enhanced with StatsCard component */}
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-4 transition-all duration-700 delay-150 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
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

      {/* Charts Section - Enhanced with gradient charts */}
      <div className={`grid gap-4 lg:grid-cols-3 transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        {/* Scholarship Trends Chart (Revenue Style) */}
        <ScholarshipChart
          title="Scholarship Trends"
          description="Monthly awarded, disbursed, and remaining balance"
          data={[
            { name: 'Aug', awarded: 115000, disbursed: 38000, balance: 77000 },
            { name: 'Sep', awarded: 125000, disbursed: 42000, balance: 83000 },
            { name: 'Oct', awarded: 138000, disbursed: 48000, balance: 90000 },
            { name: 'Nov', awarded: 110000, disbursed: 35000, balance: 75000 },
            { name: 'Dec', awarded: 135000, disbursed: 40000, balance: 95000 },
            { name: 'Jan', awarded: 145000, disbursed: 35000, balance: 110000 },
          ]}
        />

        {/* Recent Awards Replaced by Students Chart */}
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

      {/* Scholarship Performance Overview - REMOVED as per user request */}
      {/* {scholarshipOverviewData.length > 0 && (
        <ScholarshipOverview scholarships={scholarshipOverviewData} />
      )} */}

      {/* Secondary Charts Section - Recent Awards & Distribution */}
      <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-3 transition-all duration-700 delay-[450ms] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        {/* Pie Chart - Scholarships by Type */}
        <Card className="lg:col-span-1 border-gray-200 dark:border-gray-800">
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

        {/* Recent Awards List */}
        <div className="lg:col-span-2">
          <RecentAwards awards={recentAwards} />
        </div>
      </div>

      {/* Detailed Excel-like View */}
      <Card className={`border-gray-200 dark:border-gray-800 transition-all duration-700 delay-[600ms] ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
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
          {loadingDetails ? (
            <div className="flex h-48 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-4">
              <Tabs defaultValue="GRADE_SCHOOL" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 h-auto">
                  <TabsTrigger 
                    key="GRADE_SCHOOL" 
                    value="GRADE_SCHOOL"
                    className="data-[state=active]:bg-[hsl(var(--pastel-purple))] data-[state=active]:text-gray-800 data-[state=inactive]:text-gray-600 transition-all"
                  >
                    {GRADE_LEVEL_LABELS['GRADE_SCHOOL']}
                  </TabsTrigger>
                  <TabsTrigger 
                    key="JUNIOR_HIGH" 
                    value="JUNIOR_HIGH"
                    className="data-[state=active]:bg-[hsl(var(--pastel-blue))] data-[state=active]:text-gray-800 data-[state=inactive]:text-gray-600 transition-all"
                  >
                    {GRADE_LEVEL_LABELS['JUNIOR_HIGH']}
                  </TabsTrigger>
                  <TabsTrigger 
                    key="SENIOR_HIGH" 
                    value="SENIOR_HIGH"
                    className="data-[state=active]:bg-[hsl(var(--pastel-pink))] data-[state=active]:text-gray-800 data-[state=inactive]:text-gray-600 transition-all"
                  >
                    {GRADE_LEVEL_LABELS['SENIOR_HIGH']}
                  </TabsTrigger>
                  <TabsTrigger 
                    key="COLLEGE" 
                    value="COLLEGE"
                    className="data-[state=active]:bg-[hsl(var(--pastel-orange))] data-[state=active]:text-gray-800 data-[state=inactive]:text-gray-600 transition-all"
                  >
                    {GRADE_LEVEL_LABELS['COLLEGE']}
                  </TabsTrigger>
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
                            <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
