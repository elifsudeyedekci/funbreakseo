'use client';
import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
}

export function Select({
  id,
  value,
  defaultValue,
  onChange,
  options,
  placeholder = 'Seçin...',
  label,
  error,
  disabled,
  className,
}: SelectProps) {
  const selectId = id || React.useId();

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-[var(--text-primary)]">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={value}
          defaultValue={defaultValue}
          onChange={(e) => onChange?.(e.target.value)}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border bg-[var(--bg-surface)] px-3 py-2 pr-10 text-sm text-[var(--text-primary)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-[var(--danger)]' : 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]'
          )}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
      </div>
      {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
    </div>
  );
}
