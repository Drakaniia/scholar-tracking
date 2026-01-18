'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  GraduationCap,
  FileCheck,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';

interface DashboardData {
  stats: {
    totalStudents: number;
    totalScholarships: number;
    activeScholarships: number;
    activeStudentScholarships: number;
    totalAmountAwarded: number;
    totalDisbursed: number;
  };
  recentScholarships: Array<{
    id: number;
    status: string;
    awardDate: string;
    student: {
      lastName: string;
      firstName: string;
      middleInitial: string | null;
      program: string;
    };
    scholarship: {
      scholarshipName: string;
      type: string;
    };
    grantAmount: number;
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

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalStudents: 0,
    totalScholarships: 0,
    activeScholarships: 0,
    activeStudentScholarships: 0,
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
    },
    {
      title: 'Active Scholarships',
      value: stats.activeScholarships,
      icon: GraduationCap,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Student Scholarships',
      value: stats.activeStudentScholarships,
      icon: FileCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Total Disbursed',
      value: formatCurrency(stats.totalDisbursed),
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of scholarship tracking system"
      />

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`rounded-full p-3 ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Amount Awarded Card */}
      <Card className="mt-4 overflow-hidden bg-gradient-to-r from-purple-500/10 to-pink-500/10">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Amount Awarded
              </p>
              <p className="mt-2 text-4xl font-bold text-purple-600 dark:text-purple-400">
                {formatCurrency(stats.totalAmountAwarded)}
              </p>
            </div>
            <div className="rounded-full bg-purple-500/20 p-4">
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity and Stats */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Recent Scholarship Assignments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Recent Scholarship Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentScholarships && data.recentScholarships.length > 0 ? (
              <div className="space-y-4">
                {data.recentScholarships.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {item.student.lastName}, {item.student.firstName} {item.student.middleInitial || ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.scholarship.scholarshipName}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(item.awardDate)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No recent scholarship assignments
              </p>
            )}
          </CardContent>
        </Card>

        {/* Distribution Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
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
                        <span className="text-sm">{item.gradeLevel}</span>
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
    </div>
  );
}
