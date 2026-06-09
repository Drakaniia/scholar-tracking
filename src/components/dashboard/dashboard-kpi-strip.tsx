'use client';

import { Award, CreditCard, GraduationCap, Users } from 'lucide-react';

import { formatCompactPhp, getPercent } from '@/components/dashboard/dashboard-formatters';
import type { DashboardData } from '@/components/dashboard/dashboard-types';
import { AnimatedNumber, AnimatedProgressBar } from '@/components/shared';
import { cn } from '@/lib/utils';

interface DashboardKpiStripProps {
  readonly stats: DashboardData['stats'];
}

const KPI_ICON_STYLES = {
  emerald: 'bg-emerald-100 text-emerald-800',
  slate: 'bg-slate-100 text-slate-800',
  amber: 'bg-amber-100 text-amber-800',
  sky: 'bg-sky-100 text-sky-800',
} as const;

const KPI_PROGRESS_STYLES = {
  emerald: 'bg-[hsl(var(--pastel-green))]',
  slate: 'bg-[hsl(var(--pastel-purple))]',
  amber: 'bg-[hsl(var(--pastel-orange))]',
  sky: 'bg-[hsl(var(--pastel-blue))]',
} as const;

export function DashboardKpiStrip({ stats }: DashboardKpiStripProps) {
  const coverageRate = getPercent(stats.studentsWithScholarships, stats.totalStudents);
  const activeRate = getPercent(stats.activeScholarships, stats.totalScholarships);
  const disbursementRate = getPercent(stats.totalDisbursed, stats.totalAmountAwarded);

  return (
    <div className="grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm sm:grid-cols-2 xl:grid-cols-4">
      <KpiItem
        title="Students"
        value={stats.totalStudents}
        detail={`${stats.studentsWithScholarships} covered`}
        icon={Users}
        iconTone="emerald"
        progressTone="emerald"
        progress={coverageRate}
      />
      <KpiItem
        title="Programs"
        value={`${stats.activeScholarships}/${stats.totalScholarships}`}
        detail={`${activeRate}% currently active`}
        icon={GraduationCap}
        iconTone="slate"
        progressTone="slate"
        progress={activeRate}
      />
      <KpiItem
        title="Awarded"
        value={formatCompactPhp(stats.totalAmountAwarded)}
        detail="Committed assistance"
        icon={Award}
        iconTone="amber"
      />
      <KpiItem
        title="Released"
        value={formatCompactPhp(stats.totalDisbursed)}
        detail={`${disbursementRate}% of awarded funds`}
        icon={CreditCard}
        iconTone="sky"
        progressTone="sky"
        progress={disbursementRate}
      />
    </div>
  );
}

function KpiItem({
  title,
  value,
  detail,
  icon: Icon,
  iconTone,
  progressTone = iconTone,
  progress,
}: {
  readonly title: string;
  readonly value: string | number;
  readonly detail: string;
  readonly icon: typeof Users;
  readonly iconTone: keyof typeof KPI_ICON_STYLES;
  readonly progressTone?: keyof typeof KPI_PROGRESS_STYLES;
  readonly progress?: number;
}) {
  const normalizedProgress =
    typeof progress === 'number' ? Math.min(Math.max(progress, 0), 100) : null;

  return (
    <div className="min-w-0 border-b border-slate-200 p-4 last:border-b-0 sm:border-r sm:last:border-r-0 xl:border-b-0">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="truncate text-sm font-semibold text-slate-500">{title}</p>
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
            KPI_ICON_STYLES[iconTone]
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="truncate text-2xl font-black text-slate-950">
        <AnimatedNumber value={value} />
      </div>
      <p className="mt-1 truncate text-xs font-medium text-slate-500">{detail}</p>
      {normalizedProgress !== null && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <AnimatedProgressBar
            width={normalizedProgress}
            className={KPI_PROGRESS_STYLES[progressTone]}
          />
        </div>
      )}
    </div>
  );
}
