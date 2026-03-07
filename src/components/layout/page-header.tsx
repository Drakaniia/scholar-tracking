'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import backgroundImage from '@/assets/images/background2.jpg';

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
 <Card className="relative border-gray-200 bg-white border-t-4 border-t-[#22c55e] mb-6 overflow-hidden">
 {/* Background image positioned on the right, mirrored */}
 <div className="absolute inset-y-0 right-0 w-1/2">
 <Image
 src={backgroundImage}
 alt="Background"
 fill
 className="object-cover -scale-x-100 opacity-60"
 priority
 />
 </div>

 {/* Smooth gradient fade from image to white on the left */}
 <div className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-transparent via-white/20 to-white" />

 {/* Content with relative positioning to stay above background */}
 <div
 className={cn(
 'relative z-10 flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between',
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
