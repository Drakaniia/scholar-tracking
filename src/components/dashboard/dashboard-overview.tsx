'use client';

import {
  getRecentAwards,
  getScholarshipTypeData,
  getStudentsChartData,
} from '@/components/dashboard/dashboard-data';
import { getSourceLabel } from '@/components/dashboard/dashboard-formatters';
import { DashboardHero } from '@/components/dashboard/dashboard-hero';
import { DashboardKpiStrip } from '@/components/dashboard/dashboard-kpi-strip';
import type { DashboardData } from '@/components/dashboard/dashboard-types';
import { RecentAwards } from '@/components/dashboard/recent-awards';
import { ScholarshipChart } from '@/components/dashboard/scholarship-chart';
import { ScholarshipTypePanel } from '@/components/dashboard/scholarship-type-panel';
import { StudentsChart } from '@/components/dashboard/students-chart';

interface DashboardOverviewProps {
  readonly data: DashboardData;
  readonly scholarshipSourceFilter: string;
  readonly onScholarshipSourceChange: (value: string) => void;
  readonly gradeLevelFilter: string;
  readonly onGradeLevelChange: (value: string) => void;
}

export function DashboardOverview({
  data,
  scholarshipSourceFilter,
  onScholarshipSourceChange,
  gradeLevelFilter,
  onGradeLevelChange,
}: DashboardOverviewProps) {
  const studentsChartData = getStudentsChartData(data);
  const scholarshipTypeData = getScholarshipTypeData(data);
  const recentAwards = getRecentAwards(data);
  const sourceLabel = getSourceLabel(scholarshipSourceFilter);

  return (
    <div className="space-y-5">
      <DashboardHero
        stats={data.stats}
        scholarshipSourceFilter={scholarshipSourceFilter}
        onScholarshipSourceChange={onScholarshipSourceChange}
        gradeLevelFilter={gradeLevelFilter}
        onGradeLevelChange={onGradeLevelChange}
      />

      <DashboardKpiStrip stats={data.stats} />

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
        <ScholarshipChart
          title="Fund Movement"
          description="Awarded, released, and remaining balance by month"
          data={data.charts.monthlyTrends}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
          <StudentsChart
            data={studentsChartData}
            title="Student Mix"
            description="Enrollment distribution by level"
          />
          <ScholarshipTypePanel data={scholarshipTypeData} sourceLabel={sourceLabel} />
        </div>
      </section>

      <RecentAwards awards={recentAwards} />
    </div>
  );
}
