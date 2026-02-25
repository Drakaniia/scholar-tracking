'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

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
 <Card className="border-gray-200 bg-white border-t-4 border-t-[#22c55e] mb-6">
 <div
 className={cn(
 'flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between',
 className
 )}
 >
 <div>
 <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-gray-900">{title}</h1>
 {description && (
 <p className="mt-1 text-gray-600">{description}</p>
 )}
 </div>
 {children && <div className="flex items-center gap-2">{children}</div>}
 </div>
 </Card>
 );
}
