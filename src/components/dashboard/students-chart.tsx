'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { AnimatedChart } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StudentsChartData {
  readonly name: string;
  readonly students: number;
}

interface StudentsChartProps {
  readonly data: readonly StudentsChartData[];
  title?: string;
  description?: string;
  className?: string;
}

const COLORS = [
  'hsl(var(--pastel-purple))',
  'hsl(var(--pastel-blue))',
  'hsl(var(--pastel-pink))',
  'hsl(var(--pastel-orange))',
  'hsl(var(--pastel-green))',
] as const;

export function StudentsChart({
  data,
  title = 'Students by Grade Level',
  description = 'Distribution of students',
  className,
}: StudentsChartProps) {
  const animationKey = data.map((item) => `${item.name}:${item.students}`).join('|');

  return (
    <Card className={cn('rounded-lg border-slate-200 bg-white py-0 shadow-sm', className)}>
      <CardHeader className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-slate-950">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-sky-700" />
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">
        <div className="h-[250px]">
          <AnimatedChart animationKey={animationKey} mode="horizontal-bars">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 10, right: 14, left: 12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--muted-foreground) / 0.14)"
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={96}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border border-[#dce6e1] bg-white p-3 shadow-lg">
                          <p className="mb-2 font-medium text-slate-950">{label}</p>
                          {payload.map((entry, index) => (
                            <p
                              key={index}
                              className="flex items-center gap-2 text-sm text-slate-600"
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              {entry.value} students
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="students"
                  name="Total Students"
                  radius={[0, 6, 6, 0]}
                  barSize={28}
                  isAnimationActive={false}
                >
                  {data.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </AnimatedChart>
        </div>
      </CardContent>
    </Card>
  );
}
