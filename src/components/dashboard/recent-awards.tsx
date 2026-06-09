'use client';

import Link from 'next/link';

import { Award } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RecentAward {
  readonly id: number;
  readonly studentName: string;
  readonly scholarshipName: string;
  readonly scholarshipCount?: number;
  readonly scholarshipNames?: readonly string[];
  readonly type: string;
  readonly amount?: number;
  readonly date: string;
  readonly status: 'active' | 'pending' | 'completed';
}

interface RecentAwardsProps {
  readonly awards: readonly RecentAward[];
  limit?: number;
}

const statusStyles = {
  active: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  pending: 'border-amber-200 bg-amber-50 text-amber-800',
  completed: 'border-sky-200 bg-sky-50 text-sky-800',
};

export function RecentAwards({ awards, limit = 5 }: RecentAwardsProps) {
  const displayAwards = awards.slice(0, limit);

  return (
    <Card className="rounded-lg border-slate-200 bg-white py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <Award className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-base text-slate-950">Recent Awards</CardTitle>
            <CardDescription>Latest student scholarship activity</CardDescription>
          </div>
        </div>
        <Link href="/students" className="text-sm font-medium text-emerald-700 hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="px-5 py-5">
        <div className="divide-y divide-slate-100">
          {displayAwards.map((award) => (
            <div
              key={award.id}
              className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[auto_1fr_auto]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 font-semibold text-slate-800">
                {award.studentName.charAt(0)}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-slate-950">{award.studentName}</p>
                  {award.scholarshipCount && award.scholarshipCount > 1 && (
                    <Badge
                      className="border-amber-200 bg-amber-50 text-amber-900"
                      variant="outline"
                    >
                      {award.scholarshipCount} awards
                    </Badge>
                  )}
                  <Badge className={statusStyles[award.status]} variant="outline">
                    {award.status}
                  </Badge>
                </div>
                <p className="truncate text-sm text-slate-500">
                  {award.scholarshipCount && award.scholarshipCount > 1
                    ? `${award.scholarshipCount} scholarships`
                    : award.scholarshipName}{' '}
                  / {award.type}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 text-sm sm:block sm:text-right">
                <span className="text-slate-500">{formatDate(award.date)}</span>
                {typeof award.amount === 'number' && (
                  <div className="font-semibold text-slate-950">{formatCurrency(award.amount)}</div>
                )}
              </div>
            </div>
          ))}

          {displayAwards.length === 0 && (
            <div className="rounded-lg border border-dashed border-[#d4dfd9] py-10 text-center text-sm text-slate-500">
              No recent awards
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
