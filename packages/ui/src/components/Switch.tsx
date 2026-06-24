'use client';
import * as React from 'react';
import { cn } from '../utils';

export interface SwitchProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  size?: 'sm' | 'default';
  className?: string;
}

export function Switch({
  id,
  checked,
  defaultChecked = false,
  onChange,
  disabled,
  label,
  description,
  size = 'default',
  className,
}: SwitchProps) {
  const [internal, setInternal] = React.useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internal;
  const switchId = id || React.useId();

  const handleChange = () => {
    if (disabled) return;
    const next = !isChecked;
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const sizeClasses = size === 'sm'
    ? { track: 'h-5 w-9', thumb: 'h-4 w-4', translate: 'translate-x-4' }
    : { track: 'h-6 w-11', thumb: 'h-5 w-5', translate: 'translate-x-5' };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={isChecked}
        onClick={handleChange}
        disabled={disabled}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
          sizeClasses.track,
          isChecked ? 'bg-[var(--accent)]' : 'bg-[var(--border-strong)]',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <span
          className={cn(
            'pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform',
            sizeClasses.thumb,
            isChecked ? sizeClasses.translate : 'translate-x-0'
          )}
        />
      </button>
      {(label || description) && (
        <div>
          {label && (
            <label htmlFor={switchId} className="text-sm font-medium text-[var(--text-primary)] cursor-pointer">
              {label}
            </label>
          )}
          {description && <p className="text-xs text-[var(--text-muted)]">{description}</p>}
        </div>
      )}
    </div>
  );
}
