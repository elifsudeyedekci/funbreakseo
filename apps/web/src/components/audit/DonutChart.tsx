'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { categoricalColor } from './colors';

export interface DonutChartDatum {
  label: string;
  value: number;
  /** Optional explicit color; falls back to the fixed-order categorical palette by index. */
  color?: string;
}

export interface DonutChartProps {
  data: DonutChartDatum[];
  centerLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CONFIG = {
  sm: { box: 140, inner: 40, outer: 62 },
  md: { box: 200, inner: 58, outer: 90 },
  lg: { box: 260, inner: 76, outer: 118 },
};

export function DonutChart({ data, centerLabel, size = 'md', className }: DonutChartProps) {
  const cfg = SIZE_CONFIG[size];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  if (!data || data.length === 0 || total <= 0) {
    return (
      <div className={cn('rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm', className)}>
        Veri yok
      </div>
    );
  }

  const chartData = data.map((d, i) => ({ ...d, color: d.color ?? categoricalColor(i) }));

  return (
    <div className={cn('flex flex-col sm:flex-row items-center gap-4', className)}>
      <div className="relative flex-shrink-0" style={{ width: cfg.box, height: cfg.box }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={cfg.inner}
              outerRadius={cfg.outer}
              paddingAngle={2}
              stroke="none"
            >
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(val: number, name: string) => [`${val} (${((val / total) * 100).toFixed(1)}%)`, name]}
              contentStyle={{
                background: '#111118',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {centerLabel && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xs text-white/50 text-center px-4">{centerLabel}</span>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 min-w-0 w-full sm:w-auto">
        {chartData.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs min-w-0">
            <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="text-white/70 truncate">{d.label}</span>
            <span className="text-white/40 ml-auto flex-shrink-0">{((d.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DonutChart;
