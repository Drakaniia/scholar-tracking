'use client';

import {
 Card,
 CardContent,
 CardDescription,
 CardHeader,
 CardTitle,
} from '@/components/ui/card';
import {
 BarChart,
 Bar,
 Cell,
 XAxis,
 YAxis,
 CartesianGrid,
 Tooltip,
 ResponsiveContainer,
} from 'recharts';

interface StudentsChartData {
 name: string;
 students: number;
}

interface StudentsChartProps {
 data: StudentsChartData[];
 title?: string;
 description?: string;
}

const COLORS = [
 'hsl(var(--pastel-purple))',
 'hsl(var(--pastel-blue))',
 'hsl(var(--pastel-pink))',
 'hsl(var(--pastel-orange))',
 'hsl(var(--pastel-green))',
];

export function StudentsChart({
 data,
 title = 'Students by Grade Level',
 description = 'Distribution of students',
}: StudentsChartProps) {
 return (
 <Card className="shadow-sm border-gray-200">
 <CardHeader>
 <div className="flex items-center gap-2">
 {/* <Users className="h-5 w-5 text-primary" /> */}
 <CardTitle className="text-xl text-foreground">{title}</CardTitle>
 </div>
 <CardDescription>{description}</CardDescription>
 </CardHeader>
 <CardContent>
 <div className="h-[350px]">
 <ResponsiveContainer width="100%" height="100%">
 <BarChart
 data={data}
 margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
 >
 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground) / 0.2)" />
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
 dx={-10}
 />
 <Tooltip
 cursor={{ fill: 'transparent' }}
 content={({ active, payload, label }) => {
 if (active && payload && payload.length) {
 return (
 <div className="rounded-lg border bg-card p-3 shadow-lg border-gray-200">
 <p className="mb-2 font-medium text-foreground">{label}</p>
 {payload.map((entry, index) => (
 <p
 key={index}
 className="flex items-center gap-2 text-sm text-foreground/80"
 >
 <span
 className="h-2 w-2 rounded-full"
 style={{ backgroundColor: entry.color }}
 />
 {entry.name}: {entry.value} students
 </p>
 ))}
 </div>
 );
 }
 return null;
 }}
 />
 <Bar
 dataKey="students"
 name="Total Students"
 radius={[4, 4, 0, 0]}
 barSize={60}
 >
 {data.map((entry, index) => (
 <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
 ))}
 </Bar>
 </BarChart>
 </ResponsiveContainer>
 </div>
 </CardContent>
 </Card>
 );
}
