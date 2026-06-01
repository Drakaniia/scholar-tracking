'use client';

import Link from 'next/link';

import { Award } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';

interface RecentAward {
  id: number;
  studentName: string;
  scholarshipName: string;
  scholarshipCount?: number;
  scholarshipNames?: string[];
  type: string;
  amount?: number;
  date: string;
  status: 'active' | 'pending' | 'completed';
}

interface RecentAwardsProps {
  awards: RecentAward[];
  limit?: number;
}

const statusStyles = {
  active: 'bg-[hsl(var(--pastel-green))]/28 text-emerald-700 border-[hsl(var(--pastel-green))]',
  pending: 'bg-[hsl(var(--pastel-orange))]/28 text-orange-700 border-[hsl(var(--pastel-orange))]',
  completed: 'bg-[hsl(var(--pastel-blue))]/28 text-sky-700 border-[hsl(var(--pastel-blue))]',
};

export function RecentAwards({ awards, limit = 5 }: RecentAwardsProps) {
  const displayAwards = awards.slice(0, limit);

  return (
    <Card className="rounded-lg border-[#e1e8e4] bg-white py-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-[#e4ece8] px-5 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--pastel-green))]/45 text-emerald-800 shadow-sm">
            <Award className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-lg text-slate-950">Recent Awards</CardTitle>
            <CardDescription>Latest student scholarship activity</CardDescription>
          </div>
        </div>
        <Link href="/students" className="text-sm font-medium text-emerald-700 hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="px-5 py-5">
        <div className="space-y-3">
          {displayAwards.map((award) => (
            <div
              key={award.id}
              className="grid gap-3 rounded-lg border border-[#e1e8e4] bg-white p-3 transition-colors hover:border-[hsl(var(--pastel-green))] hover:bg-[hsl(var(--pastel-green))]/12 sm:grid-cols-[auto_1fr_auto]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--pastel-purple))]/45 font-semibold text-violet-800">
                {award.studentName.charAt(0)}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-slate-950">{award.studentName}</p>
                  <Badge className={statusStyles[award.status]} variant="outline">
                    {award.status}
                  </Badge>
                  {award.scholarshipCount && award.scholarshipCount > 1 && (
                    <Badge
                      className="border-amber-200 bg-amber-50 text-amber-900"
                      variant="outline"
                    >
                      {award.scholarshipCount} awards
                    </Badge>
                  )}
                </div>
                <p className="truncate text-sm text-slate-500">
                  {award.scholarshipCount && award.scholarshipCount > 1
                    ? `${award.scholarshipCount} scholarships`
                    : award.scholarshipName}{' '}
                  / {award.type}
                </p>
                {award.scholarshipNames && award.scholarshipNames.length > 1 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {award.scholarshipNames.slice(0, 4).map((name, index) => (
                      <span
                        key={`${award.id}-${name}`}
                        className="rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900"
                      >
                        {index + 1}. {name.length > 24 ? `${name.slice(0, 21)}...` : name}
                      </span>
                    ))}
                  </div>
                )}
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
