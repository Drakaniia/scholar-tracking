'use client';

import { TrendingUp } from 'lucide-react';

import type { ScholarshipTypeDatum } from '@/components/dashboard/dashboard-types';
import { AnimatedNumber, AnimatedProgressBar, StaggeredReveal } from '@/components/shared';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ScholarshipTypePanelProps {
  readonly data: readonly ScholarshipTypeDatum[];
  readonly sourceLabel: string;
}

const BAR_COLORS = [
  'hsl(var(--pastel-purple))',
  'hsl(var(--pastel-blue))',
  'hsl(var(--pastel-pink))',
  'hsl(var(--pastel-orange))',
  'hsl(var(--pastel-green))',
] as const;

export function ScholarshipTypePanel({ data, sourceLabel }: ScholarshipTypePanelProps) {
  const maxScholarshipTypeCount = Math.max(...data.map((item) => item.value), 1);

  return (
    <Card className="rounded-lg border-slate-200 bg-white py-0 shadow-sm">
      <CardHeader className="border-b border-slate-200 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-slate-950">Program Mix</CardTitle>
            <CardDescription>{sourceLabel}</CardDescription>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
            <TrendingUp className="h-4 w-4" />
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-5 py-5">
        {data.length > 0 ? (
          <StaggeredReveal
            className="space-y-4"
            animationKey={data.map((item) => `${item.name}:${item.value}`).join('|')}
          >
            {data.map((item, index) => (
              <div key={item.name} className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-slate-700">{item.name}</span>
                  <span className="font-black text-slate-950">
                    <AnimatedNumber value={item.value} />
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <AnimatedProgressBar
                    width={(item.value / maxScholarshipTypeCount) * 100}
                    delay={index * 0.04}
                    style={{
                      backgroundColor: BAR_COLORS[index % BAR_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </StaggeredReveal>
        ) : (
          <div className="flex min-h-[190px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            No scholarship type data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
