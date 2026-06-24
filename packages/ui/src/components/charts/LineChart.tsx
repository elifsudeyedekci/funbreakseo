'use client';
import * as React from 'react';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../utils';

interface LineConfig {
  key: string;
  label: string;
  color?: string;
  dashed?: boolean;
}

interface LineChartProps {
  data: Record<string, unknown>[];
  lines: LineConfig[];
  xKey?: string;
  height?: number;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  tooltipFormatter?: (value: unknown, name: string) => [string, string];
}

const DEFAULT_COLORS = ['#5B8DEF', '#A371F7', '#3FB950', '#E3B341', '#F85149', '#58A6FF'];

export function LineChart({
  data,
  lines,
  xKey = 'date',
  height = 300,
  className,
  showGrid = true,
  showLegend = true,
  tooltipFormatter,
}: LineChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ReLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
            formatter={tooltipFormatter}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />}
          {lines.map((l, i) => (
            <Line
              key={l.key}
              type="monotone"
              dataKey={l.key}
              name={l.label}
              stroke={l.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              strokeWidth={2}
              strokeDasharray={l.dashed ? '5 5' : undefined}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          ))}
        </ReLineChart>
      </ResponsiveContainer>
    </div>
  );
}
