'use client';
import * as React from 'react';
import { cn } from '../utils';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  default: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({ src, alt, fallback, size = 'default', className }: AvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const initials = fallback
    ? fallback.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)]', sizeMap[size], className)}>
      {src && !imgError ? (
        <img src={src} alt={alt || fallback || 'Avatar'} className="h-full w-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <span className="font-medium text-[var(--text-secondary)] select-none">{initials}</span>
      )}
    </div>
  );
}
