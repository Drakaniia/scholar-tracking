'use client';

import { cn } from '@/lib/utils';

interface EmptyStateProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({
    title,
    description,
    icon,
    action,
    className,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                'flex h-48 flex-col items-center justify-center gap-2 text-center',
                className
            )}
        >
            {icon && <div className="mb-2 text-muted-foreground">{icon}</div>}
            <p className="font-medium text-muted-foreground">{title}</p>
            {description && (
                <p className="text-sm text-muted-foreground/80">{description}</p>
            )}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}
