'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PieChartData {
  name: string;
  value: number;
}

interface CustomPieChartProps {
  data: PieChartData[];
  colors?: string[];
}

// Colors from the pastel palette
const THEME_COLORS = [
  'hsl(var(--pastel-purple))',
  'hsl(var(--pastel-blue))',
  'hsl(var(--pastel-orange))',
  'hsl(var(--pastel-pink))',
  'hsl(var(--pastel-green))',
];

export function CustomPieChart({ data, colors = THEME_COLORS }: CustomPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={0}
          dataKey="value"
          stroke="var(--background)"
          strokeWidth={4}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            borderColor: 'hsl(var(--border))',
            borderRadius: '8px',
            color: 'hsl(var(--foreground))',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          }}
          itemStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span style={{ color: 'hsl(var(--foreground))', fontSize: '12px', marginLeft: '4px' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
