'use client';

import Link from 'next/link';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, GraduationCap } from 'lucide-react';

interface ScholarshipInfo {
    id: string;
    name: string;
    type: string;
    studentCount: number;
    totalAmount: number;
    activeCount: number;
}

interface ScholarshipOverviewProps {
    scholarships: ScholarshipInfo[];
}

export function ScholarshipOverview({ scholarships }: ScholarshipOverviewProps) {
    return (
        <Card className="border-gray-200 dark:border-gray-800">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-primary" />
                    <CardTitle className="text-foreground">Scholarship Performance</CardTitle>
                </div>
                <CardDescription>Quick overview of scholarship programs</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {scholarships.map((scholarship) => (
                        <div
                            key={scholarship.id}
                            className="group relative rounded-xl border border-gray-200 dark:border-gray-800 bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 dark:hover:border-primary/40"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                                        {scholarship.type}
                                    </Badge>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                    asChild
                                >
                                    <Link href={`/scholarships?type=${scholarship.type}`}>
                                        <Eye className="h-4 w-4" />
                                    </Link>
                                </Button>
                            </div>

                            <h4 className="font-medium text-sm mb-3 line-clamp-1 text-muted-foreground">{scholarship.name}</h4>

                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-primary">{scholarship.studentCount}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Students</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-bold">{scholarship.activeCount}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Active</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-lg font-bold text-emerald-600">
                                        ₱{(scholarship.totalAmount / 1000).toFixed(0)}k
                                    </p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Awarded</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
