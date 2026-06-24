'use client';
import * as React from 'react';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '../../utils';

interface BarConfig {
  key: string;
  label: string;
  color?: string;
}

interface BarChartProps {
  data: Record<string, unknown>[];
  bars: BarConfig[];
  xKey?: string;
  height?: number;
  className?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  horizontal?: boolean;
  tooltipFormatter?: (value: unknown, name: string) => [string, string];
}

const DEFAULT_COLORS = ['#5B8DEF', '#A371F7', '#3FB950', '#E3B341', '#F85149'];

export function BarChart({
  data,
  bars,
  xKey = 'name',
  height = 300,
  className,
  showGrid = true,
  showLegend = false,
  stacked = false,
  horizontal = false,
  tooltipFormatter,
}: BarChartProps) {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <ReBarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          barCategoryGap="30%"
        >
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={!horizontal} horizontal={horizontal} />}
          {horizontal ? (
            <>
              <YAxis dataKey={xKey} type="category" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={80} />
              <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={40} />
            </>
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              fontSize: '12px',
              color: 'var(--text-primary)',
            }}
            cursor={{ fill: 'var(--border-subtle)', opacity: 0.5 }}
            formatter={tooltipFormatter}
          />
          {showLegend && <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />}
          {bars.map((b, i) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              fill={b.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]}
              stackId={stacked ? 'stack' : undefined}
              radius={stacked ? undefined : [4, 4, 0, 0]}
            />
          ))}
        </ReBarChart>
      </ResponsiveContainer>
    </div>
  );
}
