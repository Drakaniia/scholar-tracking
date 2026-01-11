'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  FileCheck,
  Clock,
  TrendingUp,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import Link from 'next/link';

interface DashboardData {
  stats: {
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    rejectedApplications: number;
    totalAmountReceived: number;
  };
  myApplications: Array<{
    id: number;
    status: string;
    dateApplied: string;
    scholarship: {
      name: string;
      amount: number;
    };
  }>;
  availableScholarships: Array<{
    id: number;
    name: string;
    amount: number;
    type: string;
    description: string | null;
  }>;
}

export default function WebDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch('/api/web/dashboard');
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else if (res.status === 401) {
          router.push('/web/login');
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
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    rejectedApplications: 0,
    totalAmountReceived: 0,
  };

  const statCards = [
    {
      title: 'Total Applications',
      value: stats.totalApplications,
      icon: FileCheck,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Pending',
      value: stats.pendingApplications,
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Approved',
      value: stats.approvedApplications,
      icon: FileCheck,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Amount Received',
      value: formatCurrency(stats.totalAmountReceived),
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to Your Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Track your scholarship applications and discover new opportunities
        </p>
      </div>

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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                My Applications
              </span>
              <Link href="/web/applications">
                <Button variant="outline" size="sm">
                  View All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.myApplications && data.myApplications.length > 0 ? (
              <div className="space-y-4">
                {data.myApplications.slice(0, 5).map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{app.scholarship.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(app.scholarship.amount)}
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
              <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mb-2 opacity-50" />
                <p>No applications yet</p>
                <p className="text-sm">Start exploring scholarships below</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Available Scholarships
              </span>
              <Link href="/web/scholarships">
                <Button variant="outline" size="sm">
                  Browse All
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data?.availableScholarships && data.availableScholarships.length > 0 ? (
              <div className="space-y-4">
                {data.availableScholarships.slice(0, 5).map((scholarship) => (
                  <div
                    key={scholarship.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{scholarship.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {scholarship.description || 'No description'}
                      </p>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(scholarship.amount)}
                      </p>
                      <Badge variant="outline" className="mt-1">
                        {scholarship.type}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
                <GraduationCap className="h-12 w-12 mb-2 opacity-50" />
                <p>No scholarships available</p>
                <p className="text-sm">Check back later for new opportunities</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}