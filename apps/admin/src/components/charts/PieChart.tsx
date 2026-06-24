'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PieChartProps {
  data: { name: string; value: number; color: string }[];
  height?: number;
  innerRadius?: number;
}

export function PieChart({ data, height = 280, innerRadius = 60 }: PieChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={innerRadius + 50}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-primary)',
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
