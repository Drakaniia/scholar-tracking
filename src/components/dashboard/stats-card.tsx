'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

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
    variant?: 'default' | 'blue' | 'pink' | 'orange' | 'green';
}

const VARIANTS = {
    default: {
        bg: 'bg-primary/10',
        text: 'text-primary',
        gradient: 'from-primary/20 via-primary/10',
    },
    blue: {
        bg: 'bg-[hsl(var(--pastel-blue))]/30',
        text: 'text-blue-700 dark:text-blue-400',
        gradient: 'from-[hsl(var(--pastel-blue))]/30 via-[hsl(var(--pastel-blue))]/15',
    },
    pink: {
        bg: 'bg-[hsl(var(--pastel-pink))]/30',
        text: 'text-pink-700 dark:text-pink-400',
        gradient: 'from-[hsl(var(--pastel-pink))]/30 via-[hsl(var(--pastel-pink))]/15',
    },
    orange: {
        bg: 'bg-[hsl(var(--pastel-orange))]/30',
        text: 'text-orange-700 dark:text-orange-400',
        gradient: 'from-[hsl(var(--pastel-orange))]/30 via-[hsl(var(--pastel-orange))]/15',
    },
    green: {
        bg: 'bg-[hsl(var(--pastel-green))]/30',
        text: 'text-green-700 dark:text-green-400',
        gradient: 'from-[hsl(var(--pastel-green))]/30 via-[hsl(var(--pastel-green))]/15',
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
    variant = 'default',
}: StatsCardProps) {
    const styles = VARIANTS[variant];

    return (
        <Card className={cn('relative overflow-hidden transition-all hover:shadow-lg border-gray-200 dark:border-gray-800', className)}>
            {/* Enhanced gradient overlay */}
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br to-transparent pointer-events-none opacity-60",
                styles.gradient
            )} />

            <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground/80">
                    {title}
                </CardTitle>
                <div className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-full shadow-sm',
                    styles.bg,
                    iconClassName
                )}>
                    <Icon className={cn("h-4 w-4", styles.text)} />
                </div>
            </CardHeader>

            <CardContent className="relative z-10">
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                {(description || trend) && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
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
                        {trend && description && <span className="text-muted-foreground/60">·</span>}
                        {description}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
