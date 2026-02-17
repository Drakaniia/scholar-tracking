'use client';

import Link from 'next/link';
import {
 Card,
 CardContent,
 CardDescription,
 CardHeader,
 CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface RecentAward {
 id: number;
 studentName: string;
 scholarshipName: string;
 type: string;
 amount: number;
 date: string;
 status: 'active' | 'pending' | 'completed';
}

interface RecentAwardsProps {
 awards: RecentAward[];
 limit?: number;
}

const statusStyles = {
 active: 'bg-emerald-100 text-emerald-700',
 pending: 'bg-amber-100 text-amber-700',
 completed: 'bg-blue-100 text-blue-700',
};

export function RecentAwards({ awards, limit = 5 }: RecentAwardsProps) {
 const displayAwards = awards.slice(0, limit);

 return (
 <Card className="border-gray-200">
 <CardHeader className="flex flex-row items-center justify-between">
 <div className="flex items-center gap-2">
 <Award className="h-5 w-5 text-primary" />
 <div>
 <CardTitle className="text-lg text-foreground">Recent Awards</CardTitle>
 <CardDescription>Latest scholarship awards</CardDescription>
 </div>
 </div>
 <Link
 href="/students"
 className="text-sm font-medium text-primary hover:underline"
 >
 View all
 </Link>
 </CardHeader>
 <CardContent>
 <div className="space-y-4">
 {displayAwards.map((award) => (
 <div
 key={award.id}
 className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-muted/50"
 >
 {/* Avatar */}
 <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
 {award.studentName.charAt(0)}
 </div>

 {/* Info */}
 <div className="flex-1 space-y-1 min-w-0">
 <div className="flex items-center justify-between gap-2">
 <p className="font-medium truncate">{award.studentName}</p>
 <Badge className={statusStyles[award.status]} variant="secondary">
 {award.status}
 </Badge>
 </div>
 <p className="text-sm text-muted-foreground truncate">
 {award.scholarshipName} • {award.type}
 </p>
 <div className="flex items-center justify-between text-xs text-muted-foreground">
 <span>{award.date}</span>
 <span className="font-semibold text-foreground">
 {formatCurrency(award.amount)}
 </span>
 </div>
 </div>
 </div>
 ))}

 {displayAwards.length === 0 && (
 <p className="text-center text-muted-foreground py-4">
 No recent awards
 </p>
 )}
 </div>
 </CardContent>
 </Card>
 );
}
