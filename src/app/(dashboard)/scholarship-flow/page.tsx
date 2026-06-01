'use client';

import { useState } from 'react';

import {
  ArrowUpRight,
  Award,
  BadgeCheck,
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

import { PageHeader } from '@/components/layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScholarshipFlowData, useScholarshipFlow } from '@/hooks/use-queries';
import { formatCurrency } from '@/lib/utils';
import { SCHOLARSHIP_SOURCES, SCHOLARSHIP_SOURCE_LABELS } from '@/types';

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
      <div className="text-2xl font-semibold text-slate-950">{value}</div>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

function FlowChart({ years }: { years: ScholarshipFlowData['years'] }) {
  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm lg:col-span-2">
      <CardHeader className="border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
            <LineChart className="h-4 w-4" />
          </span>
          <div>
            <CardTitle className="text-lg text-slate-950">Five-Year Scholarship Flow</CardTitle>
            <p className="text-sm text-slate-500">
              Awarded funds, released funds, and beneficiary count by year
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="h-[360px]">
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
              {data.summary.multiScholarshipStudents}
            </span>
            <Badge className="bg-white text-amber-800" variant="outline">
              {multiShare}% of active
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          {data.loadDistribution.map((row) => (
            <div key={row.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">{row.label}</span>
                <span className="text-slate-500">
                  {row.students} students / {row.percentage}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${
                    row.key === 'one'
                      ? 'bg-emerald-400'
                      : row.key === 'two'
                        ? 'bg-sky-400'
                        : row.key === 'three'
                          ? 'bg-amber-400'
                          : row.key === 'fourPlus'
                            ? 'bg-rose-400'
                            : 'bg-slate-300'
                  }`}
                  style={{ width: `${Math.max((row.students / maxStudents) * 100, 3)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function YearComparison({ years }: { years: ScholarshipFlowData['years'] }) {
  return (
    <section className="grid gap-3 md:grid-cols-5">
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
                  {formatCompactPhp(year.awardedAmount)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Disbursed</p>
                <p className="font-semibold text-emerald-700">
                  {formatCompactPhp(year.disbursedAmount)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Students</span>
                <span className="font-semibold text-slate-950">{year.beneficiaryCount}</span>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full float-left bg-emerald-400"
                style={{ width: `${internalShare}%` }}
              />
              <div className="h-full bg-sky-400" style={{ width: `${externalShare}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">
              <span>Internal {internalShare}%</span>
              <span>External {externalShare}%</span>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function TypeBars({ data }: { data: ScholarshipFlowData }) {
  const topTypes = data.topTypes.slice(0, 6);

  return (
    <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
      <CardHeader className="border-b border-slate-200">
        <CardTitle className="text-lg text-slate-950">Top Scholarship Types</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="h-[280px]">
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
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScholarshipFlowPage() {
  const [sourceFilter, setSourceFilter] = useState('all');
  const {
    data: flowResponse,
    isLoading,
    isFetching,
    refetch,
  } = useScholarshipFlow(sourceFilter, {
    refetchOnWindowFocus: false,
  });
  const data = flowResponse?.data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Scholarship Flow"
        description="Compare scholarship movement and student scholarship load across the last five years"
      >
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-10 w-[210px]">
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
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </PageHeader>

      {isLoading || !data ? (
        <div className="flex h-[55vh] items-center justify-center rounded-lg border border-slate-200 bg-white">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <p className="text-sm text-slate-500">Loading scholarship flow...</p>
          </div>
        </div>
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
                  This view separates money flow from student load, so one-scholarship students and
                  students carrying 2, 3, or 4 scholarships are visible immediately.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t border-emerald-100 bg-slate-950 p-5 text-white lg:border-l lg:border-t-0">
                <div>
                  <p className="text-xs uppercase text-slate-400">Awarded</p>
                  <p className="mt-1 text-xl font-semibold">
                    {formatCompactPhp(data.summary.totalAwarded)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Disbursed</p>
                  <p className="mt-1 text-xl font-semibold">
                    {formatCompactPhp(data.summary.totalDisbursed)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Beneficiaries</p>
                  <p className="mt-1 text-xl font-semibold">{data.summary.totalBeneficiaries}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-400">Max Stack</p>
                  <p className="mt-1 text-xl font-semibold">
                    {data.summary.maxScholarshipsPerStudent} scholarships
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
              detail="Unique students awarded in five years"
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
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <FlowChart years={data.years} />
            <ScholarshipLoadPanel data={data} />
          </section>

          <YearComparison years={data.years} />

          <section className="grid gap-5 lg:grid-cols-2">
            <TypeBars data={data} />
            <Card className="rounded-lg border-slate-200 bg-white shadow-sm">
              <CardHeader className="border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-50 text-sky-700">
                    <BadgeCheck className="h-4 w-4" />
                  </span>
                  <CardTitle className="text-lg text-slate-950">
                    Students With Multiple Scholarships
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-5">
                {data.multiScholarshipStudents.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
                    No students with multiple scholarships in the selected source.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.multiScholarshipStudents.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {student.studentName}
                            </p>
                            <p className="text-xs text-slate-500">
                              {student.yearLevel} / {student.program || student.gradeLevel}
                            </p>
                          </div>
                          <Badge className="shrink-0 bg-amber-100 text-amber-900" variant="outline">
                            {student.scholarshipCount} scholarships
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {student.scholarships.map((scholarship, index) => (
                            <span
                              key={`${student.id}-${scholarship.scholarshipName}-${index}`}
                              className="rounded-md border border-white bg-white px-2 py-1 text-xs text-slate-700 shadow-sm"
                            >
                              {index + 1}. {scholarship.scholarshipName}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
