'use client';

import Link from 'next/link';

import { ArrowRight, Filter, Landmark, Users } from 'lucide-react';

import { formatPhp, getPercent, getSourceLabel } from '@/components/dashboard/dashboard-formatters';
import type { DashboardData } from '@/components/dashboard/dashboard-types';
import { AnimatedNumber, AnimatedProgressBar, ExportButton } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GRADE_LEVELS, GRADE_LEVEL_LABELS, SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS } from '@/types';

interface DashboardHeroProps {
  readonly stats: DashboardData['stats'];
  readonly scholarshipSourceFilter: string;
  readonly onScholarshipSourceChange: (value: string) => void;
  readonly gradeLevelFilter: string;
  readonly onGradeLevelChange: (value: string) => void;
}

export function DashboardHero({
  stats,
  scholarshipSourceFilter,
  onScholarshipSourceChange,
  gradeLevelFilter,
  onGradeLevelChange,
}: DashboardHeroProps) {
  const coverageRate = getPercent(stats.studentsWithScholarships, stats.totalStudents);
  const disbursementRate = getPercent(stats.totalDisbursed, stats.totalAmountAwarded);
  const remainingFunds = Math.max(stats.totalAmountAwarded - stats.totalDisbursed, 0);
  const sourceLabel = getSourceLabel(scholarshipSourceFilter);

  return (
    <section className="relative overflow-hidden rounded-lg border border-slate-200 bg-[#fbfcf8] shadow-sm">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,81,50,0.08),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.8),rgba(248,250,252,0.74))]"
      />
      <div className="relative grid gap-6 p-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-6">
        <div className="flex flex-col justify-between gap-6">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              <span className="h-px w-8 bg-emerald-700" />
              {sourceLabel}
            </div>
            <div className="space-y-2">
              <h1 className="max-w-2xl text-3xl font-black leading-tight text-slate-950 md:text-4xl">
                Scholarship dashboard
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                A cleaner read on student coverage, funding release, program mix, and recent
                scholarship movement.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Select value={gradeLevelFilter} onValueChange={onGradeLevelChange}>
              <SelectTrigger className="h-10 w-full rounded-lg border-slate-300 bg-white shadow-sm sm:w-[180px]">
                <Filter className="mr-2 h-4 w-4 text-emerald-800" />
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Levels</SelectItem>
                {GRADE_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {GRADE_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={scholarshipSourceFilter} onValueChange={onScholarshipSourceChange}>
              <SelectTrigger className="h-10 w-full rounded-lg border-slate-300 bg-white shadow-sm sm:w-[220px]">
                <Filter className="mr-2 h-4 w-4 text-emerald-800" />
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
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-lg border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            >
              <Link href="/reports">
                Reports
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <ExportButton
              endpoint="/api/export/summary"
              filename="scholarship-summary-by-grade-level"
              formats={['xlsx']}
              label="Export Summary"
              variant="default"
              className="h-10 rounded-lg bg-emerald-800 text-white shadow-sm hover:bg-emerald-900"
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white/86 p-4 shadow-sm backdrop-blur">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                Current read
              </p>
              <p className="mt-1 text-sm font-medium text-slate-950">{sourceLabel}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 text-white">
              <Landmark className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-4">
            <HeroSignal
              icon={Users}
              label="Student coverage"
              value={`${coverageRate}%`}
              progress={coverageRate}
              progressClassName="bg-[hsl(var(--pastel-green))]"
            />
            <HeroSignal
              icon={Landmark}
              label="Disbursement rate"
              value={`${disbursementRate}%`}
              progress={disbursementRate}
              progressClassName="bg-[hsl(var(--pastel-blue))]"
            />
          </div>

          <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
              Remaining funds
            </p>
            <p className="mt-1 text-lg font-black text-slate-950">
              <AnimatedNumber value={formatPhp(remainingFunds)} />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroSignal({
  icon: Icon,
  label,
  value,
  progress,
  progressClassName,
}: {
  readonly icon: typeof Users;
  readonly label: string;
  readonly value: string;
  readonly progress: number;
  readonly progressClassName: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-emerald-800" />
          <span className="truncate text-sm font-medium text-slate-600">{label}</span>
        </div>
        <span className="text-sm font-black text-slate-950">
          <AnimatedNumber value={value} />
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <AnimatedProgressBar width={progress} className={progressClassName} />
      </div>
    </div>
  );
}
