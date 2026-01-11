'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  GraduationCap,
  FileCheck,
  Clock,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { formatCurrency, formatDate, getFullName, getStatusColor } from '@/lib/utils';

interface DashboardData {
  stats: {
    totalStudents: number;
    totalScholarships: number;
    activeScholarships: number;
    pendingApplications: number;
    approvedApplications: number;
    totalAmountAwarded: number;
  };
  recentApplications: Array<{
    id: number;
    status: string;
    dateApplied: string;
    student: {
      firstName: string;
      middleName: string | null;
      lastName: string;
    };
    scholarship: {
      name: string;
      amount: number;
    };
  }>;
  upcomingDeadlines: Array<{
    id: number;
    name: string;
    applicationEnd: string;
  }>;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/admin/dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else if (res.status === 401) {
          router.push('/admin/login');
        }
      } catch (error) {
        console.error('Error fetching dashboard:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, [router]);

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
    pendingApplications: 0,
    approvedApplications: 0,
    totalAmountAwarded: 0,
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
      title: 'Pending Applications',
      value: stats.pendingApplications,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Approved Applications',
      value: stats.approvedApplications,
      icon: FileCheck,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  return (
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Overview of scholarship tracking system"
      />

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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Recent Applications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.recentApplications && data.recentApplications.length > 0 ? (
              <div className="space-y-4">
                {data.recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {getFullName(
                          app.student.firstName,
                          app.student.middleName,
                          app.student.lastName
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {app.scholarship.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(app.status)}>
                        {app.status}
                      </Badge>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(app.dateApplied)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No recent applications
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Deadlines
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 ? (
              <div className="space-y-4">
                {data.upcomingDeadlines.map((scholarship) => (
                  <div
                    key={scholarship.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{scholarship.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Application Deadline
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="text-orange-600">
                        {formatDate(scholarship.applicationEnd)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No upcoming deadlines
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}