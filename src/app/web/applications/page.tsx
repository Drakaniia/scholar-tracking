'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileCheck, Clock, Check, X } from 'lucide-react';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { APPLICATION_STATUSES } from '@/types';

interface Application {
  id: number;
  status: string;
  dateApplied: string;
  dateApproved: string | null;
  remarks: string | null;
  scholarship: {
    id: number;
    name: string;
    type: string;
    category: string | null;
    amount: number;
    description: string | null;
  };
}

export default function WebApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchApplications = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '100');

      const res = await fetch(`/api/web/applications?${params}`);
      const json = await res.json();
      if (json.success) {
        setApplications(json.data);
      } else if (res.status === 401) {
        router.push('/web/login');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, router]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'Rejected':
        return <X className="h-4 w-4 text-red-600" />;
      case 'Pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Applications</h1>
        <p className="text-muted-foreground mt-2">
          Track the status of your scholarship applications
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Select
              value={statusFilter || 'all'}
              onValueChange={value =>
                setStatusFilter(value === 'all' ? '' : value)
              }
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {APPLICATION_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Badge variant="outline" className="px-3 py-1">
                Total: {applications.length}
              </Badge>
              <Badge
                variant="outline"
                className="bg-yellow-100 text-yellow-800 px-3 py-1"
              >
                Pending:{' '}
                {applications.filter(a => a.status === 'Pending').length}
              </Badge>
              <Badge
                variant="outline"
                className="bg-green-100 text-green-800 px-3 py-1"
              >
                Approved:{' '}
                {applications.filter(a => a.status === 'Approved').length}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : applications.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
          <FileCheck className="h-12 w-12 mb-2 opacity-50" />
          <p>No applications yet</p>
          <p className="text-sm">
            Start applying for scholarships to track them here
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {applications.map(app => (
            <Card key={app.id}>
              <CardContent className="p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="rounded-full bg-blue-100 p-3">
                        <FileCheck className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">
                          {app.scholarship.name}
                        </h3>
                        <p className="text-muted-foreground text-sm mb-3">
                          {app.scholarship.description ||
                            'No description available'}
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge variant="outline">
                            {app.scholarship.type}
                            {app.scholarship.category &&
                              ` - ${app.scholarship.category}`}
                          </Badge>
                          <Badge variant="outline">
                            {formatCurrency(app.scholarship.amount)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Applied: {formatDate(app.dateApplied)}</p>
                          {app.dateApproved && (
                            <p>Approved: {formatDate(app.dateApproved)}</p>
                          )}
                        </div>
                        {app.remarks && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Remarks:
                            </p>
                            <p className="text-sm">{app.remarks}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getStatusColor(app.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(app.status)}
                        {app.status}
                      </span>
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
