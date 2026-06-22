'use client';

import { useState } from 'react';

import {
  ArrowUpRight,
  Award,
  CalendarRange,
  Filter,
  Layers,
  LineChart,
  RefreshCw,
  Split,
  UsersRound,
  Wallet,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { MultipleScholarshipStudentsCard } from '@/components/dashboard/multiple-scholarship-students-card';
import {
  AnimatedChart,
  AnimatedNumber,
  AnimatedProgressBar,
  StaggeredReveal,
} from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useScholarshipFlow } from '@/hooks/use-queries';
import type { ScholarshipFlowData } from '@/hooks/use-queries';
import {
  getDefaultScholarshipFlowStartYear,
  getScholarshipFlowEndYear,
} from '@/lib/scholarship-flow-years';
import { formatCurrency } from '@/lib/utils';
import { GRADE_LEVELS, GRADE_LEVEL_LABELS, SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS } from '@/types';

function formatPhp(amount: number) {
  return `PHP ${formatCurrency(amount)}`;
}

function formatCompactPhp(amount: number) {
  return `PHP ${new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)}`;
}

function getSourceLabel(source: string) {
  if (source === 'all') return 'All Sources';
  return (SCHOLARSHIP_SOURCE_LABELS as Record<string, string>)[source] || source;
}

function getShare(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Award;
  tone: 'emerald' | 'sky' | 'amber' | 'slate';
}) {
  const tones = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-800',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-md ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="text-2xl font-semibold text-slate-950">
        <AnimatedNumber value={value} />
      </div>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function FlowChart({ years }: { years: ScholarshipFlowData['years'] }) {
  const animationKey = years
    .map(
      (year) =>
        `${year.year}:${year.awardedAmount}:${year.disbursedAmount}:${year.beneficiaryCount}`
    )
    .join('|');

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-2">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <LineChart className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-lg text-slate-950">
              Five-Year Scholarship Comparative Data
            </CardTitle>
            <p className="text-sm text-slate-500">
              Awarded funds, released funds, and beneficiary count by year
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="h-[360px]">
          <AnimatedChart animationKey={animationKey} mode="vertical-bars">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={years} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis
                  yAxisId="amount"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCompactPhp(Number(value)).replace('PHP ', '')}
                />
                <YAxis yAxisId="count" orientation="right" tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="min-w-[220px] rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                        <p className="mb-2 font-semibold text-slate-950">{label}</p>
                        {payload.map((entry) => {
                          const value =
                            entry.dataKey === 'beneficiaryCount'
                              ? `${entry.value} students`
                              : formatPhp(Number(entry.value || 0));
                          return (
                            <div
                              key={String(entry.dataKey)}
                              className="flex items-center justify-between gap-4 text-sm"
                            >
                              <span className="flex items-center gap-2 text-slate-500">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: entry.color }}
                                />
                                {entry.name}
                              </span>
                              <span className="font-medium text-slate-950">{value}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }}
                />
                <Bar
                  yAxisId="amount"
                  dataKey="awardedAmount"
                  name="Awarded"
                  fill="#f59e0b"
                  radius={[5, 5, 0, 0]}
                  barSize={28}
                  isAnimationActive={false}
                />
                <Bar
                  yAxisId="amount"
                  dataKey="disbursedAmount"
                  name="Disbursed"
                  fill="#10b981"
                  radius={[5, 5, 0, 0]}
                  barSize={28}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="count"
                  type="monotone"
                  dataKey="beneficiaryCount"
                  name="Beneficiaries"
                  stroke="#0284c7"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#0284c7', stroke: 'white', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </AnimatedChart>
        </div>
      </CardContent>
    </Card>
  );
}

function ScholarshipLoadPanel({ data }: { data: ScholarshipFlowData }) {
  const maxStudents = Math.max(...data.loadDistribution.map((row) => row.students), 1);
  const multiShare = getShare(data.summary.multiScholarshipStudents, data.summary.activeStudents);

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-50 text-amber-800">
            <Layers className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-lg text-slate-950">Scholarship Load</CardTitle>
            <p className="text-sm text-slate-500">
              Single vs multiple scholarships per active student
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">Multi-scholarship students</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="text-3xl font-semibold text-slate-950">
              <AnimatedNumber value={data.summary.multiScholarshipStudents} />
            </span>
            <Badge className="bg-white text-amber-800" variant="outline">
              <AnimatedNumber value={`${multiShare}%`} /> of active
            </Badge>
          </div>
        </div>

        <StaggeredReveal
          className="space-y-3"
          animationKey={data.loadDistribution
            .map((row) => `${row.key}:${row.students}:${row.percentage}`)
            .join('|')}
        >
          {data.loadDistribution.map((row, index) => (
            <div key={row.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{row.label}</span>
                <span className="text-slate-500">
                  <AnimatedNumber value={row.students} /> students /{' '}
                  <AnimatedNumber value={`${row.percentage}%`} />
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <AnimatedProgressBar
                  width={Math.max((row.students / maxStudents) * 100, 3)}
                  delay={index * 0.04}
                  className={
                    row.key === 'one'
                      ? 'bg-emerald-400'
                      : row.key === 'two'
                        ? 'bg-sky-400'
                        : row.key === 'three'
                          ? 'bg-amber-400'
                          : row.key === 'fourPlus'
                            ? 'bg-rose-400'
                            : 'bg-slate-300'
                  }
                />
              </div>
            </div>
          ))}
        </StaggeredReveal>
      </CardContent>
    </Card>
  );
}

function YearComparison({ years }: { years: ScholarshipFlowData['years'] }) {
  return (
    <StaggeredReveal
      className="grid gap-3 md:grid-cols-5"
      animationKey={years.map((year) => `${year.year}:${year.awardedAmount}`).join('|')}
    >
      {years.map((year) => {
        const totalSourceAmount = year.internalAmount + year.externalAmount;
        const internalShare = getShare(year.internalAmount, totalSourceAmount);
        const externalShare = getShare(year.externalAmount, totalSourceAmount);

        return (
          <div
            key={year.year}
            className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-950">{year.label}</h3>
              <Badge variant="outline">{year.awardCount} awards</Badge>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500">Awarded</p>
                <p className="font-semibold text-slate-950">
                  <AnimatedNumber value={formatCompactPhp(year.awardedAmount)} />
                </p>
              </div>
              <div>
                <p className="text-slate-500">Disbursed</p>
                <p className="font-semibold text-emerald-700">
                  <AnimatedNumber value={formatCompactPhp(year.disbursedAmount)} />
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Students</span>
                <span className="font-semibold text-slate-950">
                  <AnimatedNumber value={year.beneficiaryCount} />
                </span>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <AnimatedProgressBar width={internalShare} className="float-left bg-emerald-400" />
              <AnimatedProgressBar width={externalShare} className="bg-sky-400" delay={0.05} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">
              <span>
                Internal <AnimatedNumber value={`${internalShare}%`} />
              </span>
              <span>
                External <AnimatedNumber value={`${externalShare}%`} />
              </span>
            </div>
          </div>
        );
      })}
    </StaggeredReveal>
  );
}

function TypeBars({ data }: { data: ScholarshipFlowData }) {
  const topTypes = data.topTypes.slice(0, 6);
  const animationKey = topTypes.map((item) => `${item.type}:${item.awardedAmount}`).join('|');

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-lg text-slate-950">Top Scholarship Types</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="h-[280px]">
          <AnimatedChart animationKey={animationKey} mode="horizontal-bars">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTypes} layout="vertical" margin={{ left: 10, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="type"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => formatPhp(Number(value))}
                  labelClassName="font-semibold"
                />
                <Bar
                  dataKey="awardedAmount"
                  fill="#38bdf8"
                  radius={[0, 6, 6, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </AnimatedChart>
        </div>
      </CardContent>
    </Card>
  );
}

function ScholarshipFlowSkeleton() {
  return (
    <>
      <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1fr_0.72fr]">
          <div className="bg-[linear-gradient(135deg,#ecfdf5_0%,#f0f9ff_58%,#fff7ed_100%)] p-5 lg:p-6">
            <Skeleton className="mb-3 h-7 w-44 rounded-md bg-white/80" />
            <Skeleton className="h-9 w-full max-w-lg bg-white/80" />
            <Skeleton className="mt-3 h-5 w-full max-w-2xl bg-white/70" />
            <Skeleton className="mt-2 h-5 w-full max-w-xl bg-white/70" />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-emerald-100 bg-slate-950 p-5 lg:border-l lg:border-t-0">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-3 w-20 bg-slate-700" />
                <Skeleton className="h-7 w-28 bg-slate-700" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-9 rounded-md" />
            </div>
            <Skeleton className="h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-56" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <Skeleton className="h-[360px] w-full" />
          </CardContent>
        </Card>
        <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-md" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <Skeleton className="h-[104px] w-full rounded-lg" />
            <div className="space-y-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between gap-3">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 md:grid-cols-5">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-3">
              {[...Array(3)].map((__, rowIndex) => (
                <div key={rowIndex} className="space-y-1">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
          </div>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        {[...Array(2)].map((_, index) => (
          <Card key={index} className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-200">
              <Skeleton className="h-6 w-64" />
            </CardHeader>
            <CardContent className="pt-5">
              <Skeleton className="h-[280px] w-full" />
            </CardContent>
          </Card>
        ))}
      </section>
    </>
  );
}

export default function ScholarshipFlowPage() {
  const [sourceFilter, setSourceFilter] = useState('all');
  const [gradeLevelFilter, setGradeLevelFilter] = useState('');
  const [startYearFilter, setStartYearFilter] = useState(() =>
    getDefaultScholarshipFlowStartYear()
  );
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [draftStartYear, setDraftStartYear] = useState(() =>
    String(getDefaultScholarshipFlowStartYear())
  );
  const {
    data: flowResponse,
    isLoading,
    isFetching,
    refetch,
  } = useScholarshipFlow(sourceFilter, startYearFilter, gradeLevelFilter, {
    refetchOnWindowFocus: false,
  });
  const data = flowResponse?.data;
  const selectedEndYear = getScholarshipFlowEndYear(startYearFilter);
  const selectedWindowLabel = `${startYearFilter}-${selectedEndYear}`;
  const draftStartYearNumber = Number(draftStartYear);
  const hasValidDraftStartYear =
    Number.isInteger(draftStartYearNumber) &&
    draftStartYearNumber >= 1900 &&
    draftStartYearNumber <= 2200;
  const draftWindowLabel = hasValidDraftStartYear
    ? `${draftStartYearNumber}-${getScholarshipFlowEndYear(draftStartYearNumber)}`
    : 'Enter a valid start year';

  const handleYearDialogOpenChange = (open: boolean) => {
    setYearDialogOpen(open);
    if (open) {
      setDraftStartYear(String(startYearFilter));
    }
  };

  const handleApplyWindow = () => {
    if (!hasValidDraftStartYear) return;
    setStartYearFilter(draftStartYearNumber);
    setYearDialogOpen(false);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-emerald-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-emerald-100 bg-emerald-50/60 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-emerald-950">5-Year Window</p>
              <p className="text-xs text-emerald-800">
                Showing {selectedWindowLabel} for {getSourceLabel(sourceFilter).toLowerCase()}
              </p>
            </div>
          </div>
          <Badge className="w-fit border-emerald-200 bg-white text-emerald-800" variant="outline">
            <CalendarRange className="mr-1 h-3.5 w-3.5" />
            Showing {selectedWindowLabel}
          </Badge>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-[minmax(180px,240px)_minmax(220px,280px)_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="flow-start-year" className="text-xs font-semibold text-slate-500">
              Start Year
            </Label>
            <Button
              id="flow-start-year"
              type="button"
              variant="outline"
              onClick={() => handleYearDialogOpenChange(true)}
              className="h-10 w-full justify-between border-slate-300 bg-white px-3 font-semibold text-slate-900"
            >
              <span>{selectedWindowLabel}</span>
              <span className="text-xs font-medium text-emerald-700">Choose Year</span>
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="flow-grade-level" className="text-xs font-semibold text-slate-500">
              Education Level
            </Label>
            <Select value={gradeLevelFilter} onValueChange={setGradeLevelFilter}>
              <SelectTrigger
                id="flow-grade-level"
                className="h-10 w-full border-slate-300 bg-white"
              >
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="flow-source" className="text-xs font-semibold text-slate-500">
              Source
            </Label>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger id="flow-source" className="h-10 w-full border-slate-300 bg-white">
                <SelectValue />
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
          </div>

          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-10 justify-center gap-2 border-slate-300 bg-white md:w-fit"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </section>

      <Dialog open={yearDialogOpen} onOpenChange={handleYearDialogOpenChange}>
        <DialogContent className="border-emerald-200 p-0 sm:max-w-md">
          <DialogHeader className="border-b border-emerald-100 bg-emerald-50 px-6 py-5">
            <DialogTitle className="flex items-center gap-2 text-emerald-950">
              <CalendarRange className="h-5 w-5 text-emerald-700" />
              Choose Comparative Data Window
            </DialogTitle>
            <DialogDescription className="text-emerald-800">
              Enter any start year. ScholarTrack will show that year plus the next four years.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-5 px-6 pb-6"
            onSubmit={(event) => {
              event.preventDefault();
              handleApplyWindow();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="flow-window-start-year">Start Year</Label>
              <Input
                id="flow-window-start-year"
                type="number"
                inputMode="numeric"
                min={1900}
                max={2200}
                step={1}
                value={draftStartYear}
                onChange={(event) => setDraftStartYear(event.target.value)}
                className="h-11 border-slate-300 text-lg font-semibold"
              />
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold text-emerald-700">Window Preview</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-950">{draftWindowLabel}</p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setYearDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!hasValidDraftStartYear}>
                Apply Window
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {isLoading || !data ? (
        <ScholarshipFlowSkeleton />
      ) : (
        <>
          <section className="overflow-hidden rounded-lg border border-emerald-200 bg-white shadow-sm">
            <div className="grid gap-0 lg:grid-cols-[1fr_0.72fr]">
              <div className="bg-[linear-gradient(135deg,#ecfdf5_0%,#f0f9ff_58%,#fff7ed_100%)] p-5 lg:p-6">
                <Badge
                  className="mb-3 border-emerald-200 bg-white text-emerald-700"
                  variant="outline"
                >
                  {getSourceLabel(sourceFilter)} / {data.summary.startYear}-{data.summary.endYear}
                </Badge>
                <h1 className="max-w-3xl text-3xl font-semibold text-slate-950">
                  Five-year scholarship comparison
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  This view separates funding data from student load, so one-scholarship students
                  and students carrying 2, 3, or 4 scholarships are visible immediately.
                </p>
              </div>
              <StaggeredReveal
                className="grid grid-cols-2 gap-3 border-t border-emerald-100 bg-slate-950 p-5 text-white lg:border-l lg:border-t-0"
                animationKey={`${data.summary.totalAwarded}:${data.summary.totalDisbursed}:${data.summary.totalBeneficiaries}:${data.summary.maxScholarshipsPerStudent}`}
              >
                <div>
                  <p className="text-xs uppercase text-slate-400">Awarded</p>
                  <p className="mt-1 text-xl font-semibold">
                    <AnimatedNumber value={formatCompactPhp(data.summary.totalAwarded)} />
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Disbursed</p>
                  <p className="mt-1 text-xl font-semibold">
                    <AnimatedNumber value={formatCompactPhp(data.summary.totalDisbursed)} />
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Beneficiaries</p>
                  <p className="mt-1 text-xl font-semibold">
                    <AnimatedNumber value={data.summary.totalBeneficiaries} />
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Max Stack</p>
                  <p className="mt-1 text-xl font-semibold">
                    <AnimatedNumber value={data.summary.maxScholarshipsPerStudent} /> scholarships
                  </p>
                </div>
              </StaggeredReveal>
            </div>
          </section>

          <StaggeredReveal
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            animationKey={`${data.summary.totalAwarded}:${data.summary.totalDisbursed}:${data.summary.totalBeneficiaries}:${data.summary.multiScholarshipStudents}`}
          >
            <MetricTile
              label="Total Awarded"
              value={formatCompactPhp(data.summary.totalAwarded)}
              detail={`${data.summary.totalAwards} scholarship awards`}
              icon={Award}
              tone="amber"
            />
            <MetricTile
              label="Total Released"
              value={formatCompactPhp(data.summary.totalDisbursed)}
              detail={`${formatCompactPhp(data.summary.totalBalance)} balance`}
              icon={Wallet}
              tone="emerald"
            />
            <MetricTile
              label="Beneficiaries"
              value={data.summary.totalBeneficiaries}
              detail="Unique students awarded in selected window"
              icon={UsersRound}
              tone="sky"
            />
            <MetricTile
              label="Multiple Scholarships"
              value={data.summary.multiScholarshipStudents}
              detail={`${data.summary.singleScholarshipStudents} students have one scholarship`}
              icon={Split}
              tone="slate"
            />
          </StaggeredReveal>

          <section className="grid gap-5 lg:grid-cols-3">
            <FlowChart years={data.years} />
            <ScholarshipLoadPanel data={data} />
          </section>

          <YearComparison years={data.years} />

          <section className="grid gap-5 lg:grid-cols-2">
            <TypeBars data={data} />
            <MultipleScholarshipStudentsCard students={data.multiScholarshipStudents} />
          </section>

          <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
            <CardHeader className="border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
                <CardTitle className="text-lg text-slate-950">Top Scholarship Programs</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scholarship</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead className="text-right">Awards</TableHead>
                      <TableHead className="text-right">Students</TableHead>
                      <TableHead className="text-right">Awarded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topScholarships.map((scholarship) => (
                      <TableRow key={scholarship.scholarshipName}>
                        <TableCell className="min-w-[280px] font-medium text-slate-950">
                          {scholarship.scholarshipName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{scholarship.academicYear || 'No Year'}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{scholarship.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={scholarship.source === 'INTERNAL' ? 'default' : 'secondary'}
                          >
                            {scholarship.source === 'INTERNAL' ? 'Internal' : 'External'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{scholarship.awardCount}</TableCell>
                        <TableCell className="text-right">{scholarship.beneficiaryCount}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPhp(scholarship.awardedAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
