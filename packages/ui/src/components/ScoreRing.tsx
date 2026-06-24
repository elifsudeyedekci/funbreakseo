'use client';

import React from 'react';
import { cn } from '../lib/utils';

interface ScoreRingProps {
  score: number;
  maxScore?: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: 'blue' | 'purple' | 'green' | 'red' | 'yellow';
  tooltip?: string;
  className?: string;
}

const colorMap = {
  blue: { stroke: '#5B8DEF', glow: 'rgba(91,141,239,0.3)' },
  purple: { stroke: '#A371F7', glow: 'rgba(163,113,247,0.3)' },
  green: { stroke: '#3FB950', glow: 'rgba(63,185,80,0.3)' },
  red: { stroke: '#F85149', glow: 'rgba(248,81,73,0.3)' },
  yellow: { stroke: '#D29922', glow: 'rgba(210,153,34,0.3)' },
};

function getScoreColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

export function ScoreRing({
  score,
  maxScore = 100,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  color,
  tooltip,
  className,
}: ScoreRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / maxScore, 1);
  const offset = circumference * (1 - pct);
  const resolvedColor = color || getScoreColor(score);
  const { stroke } = colorMap[resolvedColor];

  return (
    <div
      className={cn('flex flex-col items-center gap-2', className)}
      title={tooltip}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#26262B"
            strokeWidth={strokeWidth}
          />
          {/* Score arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1s ease-in-out',
              filter: `drop-shadow(0 0 6px ${colorMap[resolvedColor].glow})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-2xl font-bold text-text-primary">{score}</span>
          <span className="text-xs text-text-muted">/{maxScore}</span>
        </div>
      </div>
      {label && (
        <div className="text-center">
          <p className="text-sm font-medium text-text-primary">{label}</p>
          {sublabel && <p className="text-xs text-text-muted">{sublabel}</p>}
        </div>
      )}
    </div>
  );
}
