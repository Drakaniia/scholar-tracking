'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DollarSign,
  TrendingUp,
  Award,
  FileSpreadsheet,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/dashboard');
        const json = await res.json();
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
  }, []);

  useEffect(() => {
    async function fetchDetailedView() {
      try {
        const res = await fetch('/api/dashboard/detailed');
        const json = await res.json();
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
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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

  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      description: `${stats.studentsWithScholarships} with scholarships`,
    },
    {
      title: 'Active Scholarships',
      value: stats.activeScholarships,
      icon: GraduationCap,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      description: `of ${stats.totalScholarships} total`,
    },
    {
      title: 'Total Awarded',
      value: formatCurrency(stats.totalAmountAwarded),
      icon: Award,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      description: 'Scholarship grants',
    },
    {
      title: 'Total Disbursed',
      value: formatCurrency(stats.totalDisbursed),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      description: 'Payments made',
    },
  ];

  const GRADE_LEVELS = ['GRADE_SCHOOL', 'JUNIOR_HIGH', 'SENIOR_HIGH', 'COLLEGE'];
  const SCHOLARSHIP_TYPES = ['PAED', 'CHED', 'LGU'];

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
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Scholarship tracking system overview"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                  {stat.description && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stat.description}
                    </p>
                  )}
                </div>
                <div className={`rounded-full p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity and Stats */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent Students with Scholarships */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recent Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentStudents && data.recentStudents.length > 0 ? (
              <div className="space-y-4">
                {data.recentStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {student.lastName}, {student.firstName} {student.middleInitial || ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {GRADE_LEVEL_LABELS[student.gradeLevel]} - {student.yearLevel}
                      </p>
                      {student.scholarship && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {student.scholarship.scholarshipName} ({student.scholarship.type})
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {student.scholarshipStatus ? (
                        <Badge variant={student.scholarshipStatus === 'Active' ? 'default' : 'secondary'}>
                          {student.scholarshipStatus}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Scholarship</Badge>
                      )}
                      {student.awardDate && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDate(student.awardDate)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No students found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Distribution Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Distribution Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Students by Grade Level */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Students by Grade Level
                </h4>
                {data?.charts?.studentsByGradeLevel && data.charts.studentsByGradeLevel.length > 0 ? (
                  <div className="space-y-2">
                    {data.charts.studentsByGradeLevel.map((item) => (
                      <div key={item.gradeLevel} className="flex items-center justify-between">
                        <span className="text-sm">{GRADE_LEVEL_LABELS[item.gradeLevel] || item.gradeLevel}</span>
                        <Badge variant="outline">{item._count.id}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </div>

              {/* Scholarships by Type */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Scholarships by Type
                </h4>
                {data?.charts?.scholarshipsByType && data.charts.scholarshipsByType.length > 0 ? (
                  <div className="space-y-2">
                    {data.charts.scholarshipsByType.map((item) => (
                      <div key={item.type} className="flex items-center justify-between">
                        <span className="text-sm">{item.type}</span>
                        <Badge variant="outline">{item._count.id}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Excel-like View - Preview */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Detailed Student Scholarship Report
            </CardTitle>
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
              <p className="text-sm text-muted-foreground">
                Preview of students with scholarships. Click &quot;View Full Report&quot; to see the complete detailed breakdown.
              </p>
              <Tabs defaultValue="GRADE_SCHOOL" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                  {GRADE_LEVELS.map((level) => (
                    <TabsTrigger key={level} value={level}>
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

                        // Show only first 3 students as preview
                        const previewStudents = students.slice(0, 3);

                        return (
                          <div key={scholarshipType} className="space-y-2">
                            <h3 className="text-lg font-semibold text-primary">
                              {scholarshipType} Scholarship ({students.length} students)
                            </h3>
                            <div className="overflow-x-auto border rounded-lg">
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
                                      <TableRow key={student.id}>
                                        <TableCell className="font-medium">{student.lastName}</TableCell>
                                        <TableCell>{student.firstName}</TableCell>
                                        <TableCell>{student.middleInitial || '-'}</TableCell>
                                        <TableCell>{student.yearLevel}</TableCell>
                                        <TableCell className="text-right font-semibold">
                                          {formatCurrency(totalFees)}
                                        </TableCell>
                                        <TableCell className="text-right text-green-600 font-semibold">
                                          {fees ? formatCurrency(Number(fees.amountSubsidy)) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                          <Badge variant="secondary">
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
