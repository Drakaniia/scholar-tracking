'use client';

import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
  progress?: number;
  variant?: 'default' | 'blue' | 'amber' | 'green' | 'rose';
}

const VARIANTS = {
  default: {
    icon: 'bg-[hsl(var(--pastel-purple))]/45 text-violet-800',
    accent: 'bg-[hsl(var(--pastel-purple))]',
    wash: 'from-[hsl(var(--pastel-purple))]/28 via-white',
  },
  blue: {
    icon: 'bg-[hsl(var(--pastel-blue))]/45 text-sky-800',
    accent: 'bg-[hsl(var(--pastel-blue))]',
    wash: 'from-[hsl(var(--pastel-blue))]/28 via-white',
  },
  amber: {
    icon: 'bg-[hsl(var(--pastel-orange))]/45 text-orange-800',
    accent: 'bg-[hsl(var(--pastel-orange))]',
    wash: 'from-[hsl(var(--pastel-orange))]/28 via-white',
  },
  green: {
    icon: 'bg-[hsl(var(--pastel-green))]/45 text-emerald-800',
    accent: 'bg-[hsl(var(--pastel-green))]',
    wash: 'from-[hsl(var(--pastel-green))]/28 via-white',
  },
  rose: {
    icon: 'bg-[hsl(var(--pastel-pink))]/45 text-pink-800',
    accent: 'bg-[hsl(var(--pastel-pink))]',
    wash: 'from-[hsl(var(--pastel-pink))]/28 via-white',
  },
};

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconClassName,
  progress,
  variant = 'default',
}: StatsCardProps) {
  const styles = VARIANTS[variant];
  const normalizedProgress =
    typeof progress === 'number' ? Math.min(Math.max(progress, 0), 100) : null;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden rounded-lg border-[#e1e8e4] bg-white py-0 shadow-[0_12px_30px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#cbdad3] hover:shadow-[0_18px_42px_rgba(15,23,42,0.1)]',
        className
      )}
    >
      <div className={cn('absolute inset-0 bg-gradient-to-br to-white/10', styles.wash)} />
      <div className={cn('absolute inset-x-0 top-0 h-1', styles.accent)} />

      <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 px-5 pt-5 pb-2">
        <CardTitle className="text-sm font-semibold text-slate-600">{title}</CardTitle>
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg shadow-sm shadow-slate-900/10',
            styles.icon,
            iconClassName
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>

      <CardContent className="relative z-10 px-5 pb-5">
        <div className="text-2xl font-bold text-slate-950">{value}</div>
        {(description || trend) && (
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
            {trend && (
              <span
                className={cn(
                  'flex items-center gap-0.5 font-medium',
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {trend.isPositive ? '+' : ''}
                {trend.value}%
              </span>
            )}
            {trend && description && <span className="text-slate-300">/</span>}
            {description}
          </div>
        )}
        {normalizedProgress !== null && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full shadow-sm transition-all', styles.accent)}
              style={{ width: `${normalizedProgress}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
