'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AnimatedChart } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ScholarshipChartData {
  readonly name: string;
  readonly awarded: number;
  readonly disbursed: number;
  readonly balance: number;
}

interface ScholarshipChartProps {
  readonly data: readonly ScholarshipChartData[];
  title?: string;
  description?: string;
  className?: string;
}

export function ScholarshipChart({
  data,
  title = 'Scholarship Overview',
  description = 'Total awarded vs disbursed amounts over time',
  className,
}: ScholarshipChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    balance: Math.max(item.balance, 0),
  }));
  const animationKey = chartData
    .map((item) => `${item.name}:${item.awarded}:${item.disbursed}:${item.balance}`)
    .join('|');

  return (
    <Card className={cn('rounded-lg border-slate-200 bg-white py-0 shadow-sm', className)}>
      <CardHeader className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-slate-950">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-700" />
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">
        {chartData.length > 0 ? (
          <div className="h-[320px] w-full">
            <AnimatedChart animationKey={animationKey} mode="vertical-bars">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="hsl(var(--muted-foreground) / 0.14)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    dy={10}
                  />
                  <YAxis
                    domain={[0, (dataMax: number) => Math.max(dataMax, 1)]}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `P${(value / 1000).toFixed(0)}k`}
                    dx={-10}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="min-w-[190px] rounded-lg border border-[#dce6e1] bg-white p-3 shadow-lg">
                            <p className="mb-2 font-medium text-slate-950">{label}</p>
                            {payload.map((entry, index) => (
                              <TooltipRow
                                key={`${entry.name}-${index}`}
                                color={entry.color}
                                name={String(entry.name)}
                                value={entry.value}
                              />
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="ml-1 text-sm text-slate-500">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="awarded"
                    name="Awarded"
                    fill="hsl(var(--pastel-orange))"
                    radius={[5, 5, 0, 0]}
                    barSize={24}
                    isAnimationActive={false}
                  />
                  <Bar
                    dataKey="disbursed"
                    name="Disbursed"
                    fill="hsl(var(--pastel-green))"
                    radius={[5, 5, 0, 0]}
                    barSize={24}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke="hsl(var(--pastel-purple))"
                    strokeWidth={2}
                    dot={{
                      r: 4,
                      fill: 'hsl(var(--pastel-purple))',
                      strokeWidth: 2,
                      stroke: 'white',
                    }}
                    activeDot={{
                      r: 6,
                      fill: 'hsl(var(--pastel-purple))',
                      strokeWidth: 2,
                      stroke: 'white',
                    }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </AnimatedChart>
          </div>
        ) : (
          <div className="flex h-[320px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            No fund movement data
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TooltipRow({
  color,
  name,
  value,
}: {
  readonly color?: string;
  readonly name: string;
  readonly value: unknown;
}) {
  const numericValue = typeof value === 'number' ? value : Number(value || 0);

  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="flex items-center gap-2 text-slate-500">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        {name}:
      </span>
      <span className="font-medium text-slate-950">{formatCurrency(numericValue)}</span>
    </div>
  );
}
