'use client';

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface AuditRadarSeries {
  name: string;
  /** Hex/CSS color for this series' stroke + fill (caller-supplied, e.g. from the categorical palette). */
  color: string;
  data: { category: string; score: number }[];
}

export interface AuditRadarChartProps {
  /** 1 series for a solo report, 2 for a "you vs competitor" comparison. */
  series: AuditRadarSeries[];
  height?: number;
  className?: string;
}

export function AuditRadarChart({ series, height = 320, className }: AuditRadarChartProps) {
  if (!series || series.length === 0 || series.every((s) => s.data.length === 0)) {
    return (
      <div className={cn('rounded-2xl border border-white/10 bg-white/2 p-8 text-center text-white/30 text-sm', className)}>
        Veri yok
      </div>
    );
  }

  // Merge all series into a single row-per-category dataset shape recharts expects.
  const categories = series[0]?.data.map((d) => d.category) ?? [];
  const merged = categories.map((category, i) => {
    const row: Record<string, string | number> = { category };
    series.forEach((s, si) => {
      row[`s${si}`] = s.data[i]?.score ?? 0;
    });
    return row;
  });

  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={merged} outerRadius="72%">
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="category" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11 }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }}
            axisLine={false}
          />
          {series.map((s, si) => (
            <Radar
              key={s.name}
              name={s.name}
              dataKey={`s${si}`}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.25}
              strokeWidth={2}
            />
          ))}
          <Tooltip
            contentStyle={{
              background: '#111118',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: 12,
            }}
          />
          {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }} />}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AuditRadarChart;
