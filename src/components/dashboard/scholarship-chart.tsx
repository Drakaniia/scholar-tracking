'use client';

import {
 Card,
 CardContent,
 CardDescription,
 CardHeader,
 CardTitle,
} from '@/components/ui/card';
import {
 AreaChart,
 Area,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
 Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface ScholarshipChartData {
 name: string;
 awarded: number;
 disbursed: number;
 balance: number;
}

interface ScholarshipChartProps {
 data: ScholarshipChartData[];
 title?: string;
 description?: string;
}

export function ScholarshipChart({
 data,
 title = 'Scholarship Overview',
 description = 'Total awarded vs disbursed amounts over time',
}: ScholarshipChartProps) {
 return (
 <Card className="col-span-full lg:col-span-2 shadow-sm border-gray-200">
 <CardHeader>
 <div className="flex items-center gap-2">
 {/* <TrendingUp className="h-5 w-5 text-primary" /> */}
 {/* Icon removed to match clean reference style */}
 <CardTitle className="text-xl text-foreground">{title}</CardTitle>
 </div>
 <CardDescription>{description}</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="h-[350px] w-full">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart
 data={data}
 margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
 >
 <defs>
 <linearGradient id="colorAwarded" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
 </linearGradient>
 <linearGradient id="colorDisbursed" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
 </linearGradient>
 <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
 <stop offset="5%" stopColor="#374151" stopOpacity={0.3} />
 <stop offset="95%" stopColor="#374151" stopOpacity={0} />
 </linearGradient>
 </defs>
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.1)" />
 <XAxis
 dataKey="name"
 tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
 tickLine={false}
 axisLine={false}
 dy={10}
 />
 <YAxis
 tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
 tickLine={false}
 axisLine={false}
 tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
 dx={-10}
 />
 <Tooltip
 content={({ active, payload, label }) => {
 if (active && payload && payload.length) {
 return (
 <div className="rounded-lg border bg-card p-3 shadow-lg border-gray-200 min-w-[180px]">
 <p className="mb-2 font-medium text-foreground">{label}</p>
 {payload.map((entry, index) => (
 <div
 key={index}
 className="flex items-center justify-between gap-2 text-sm"
 >
 <span className="flex items-center gap-2 text-muted-foreground">
 <span
 className="h-2 w-2 rounded-full"
 style={{ backgroundColor: entry.color }}
 />
 {entry.name}:
 </span>
 <span className="font-medium text-foreground">
 {formatCurrency(entry.value as number)}
 </span>
 </div>
 ))}
 </div>
 );
 }
 return null;
 }}
 />
 <Legend
 verticalAlign="bottom"
 height={36}
 iconType="circle"
 formatter={(value) => <span className="text-sm text-muted-foreground ml-1">{value}</span>}
 />
 <Area
 type="monotone"
 dataKey="awarded"
 name="Awarded" // Orange
 stroke="#f97316"
 strokeWidth={2}
 fillOpacity={1}
 fill="url(#colorAwarded)"
 activeDot={{ r: 6, fill: "#f97316", strokeWidth: 2, stroke: "white" }}
 stackId="1"
 />
 <Area
 type="monotone"
 dataKey="balance"
 name="Balance" // Dark Grey (Profit-like)
 stroke="#374151"
 strokeWidth={2}
 fillOpacity={1}
 fill="url(#colorBalance)"
 activeDot={{ r: 6, fill: "#374151", strokeWidth: 2, stroke: "white" }}
 stackId="2"
 />
 <Area
 type="monotone"
 dataKey="disbursed"
 name="Disbursed" // Teal
 stroke="#14b8a6"
 strokeWidth={2}
 fillOpacity={1}
 fill="url(#colorDisbursed)"
 activeDot={{ r: 6, fill: "#14b8a6", strokeWidth: 2, stroke: "white" }}
 stackId="3"
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 );
}
