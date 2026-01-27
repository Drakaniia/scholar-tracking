'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({
    title,
    description,
    children,
    className,
}: PageHeaderProps) {
    return (
        <div
            className={cn(
                'flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between',
                className
            )}
        >
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-black">{title}</h1>
                {description && (
                    <p className="mt-1 text-white">{description}</p>
                )}
            </div>
            {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
    );
}
