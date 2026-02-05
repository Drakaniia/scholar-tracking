'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-in">
            {/* Header skeleton */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-9 w-48" />
                    <Skeleton className="mt-2 h-5 w-80" />
                </div>
                <Skeleton className="h-10 w-36" />
            </div>

            {/* Stats cards skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
            </div>

            {/* Charts skeleton */}
            <div className="grid gap-4 lg:grid-cols-3">
                <Skeleton className="col-span-2 h-[420px] rounded-xl" />
                <Skeleton className="h-[420px] rounded-xl" />
            </div>

            {/* Lower section skeleton */}
            <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-[320px] rounded-xl" />
                <Skeleton className="h-[320px] rounded-xl" />
            </div>
        </div>
    );
}
