'use client';
import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils';

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  description?: string;
  error?: string;
  className?: string;
  required?: boolean;
}

export function Checkbox({
  id,
  checked,
  defaultChecked = false,
  disabled,
  onChange,
  label,
  description,
  error,
  className,
  required,
}: CheckboxProps) {
  const [internal, setInternal] = React.useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internal;
  const inputId = id || React.useId();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) setInternal(e.target.checked);
    onChange?.(e.target.checked);
  };

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          id={inputId}
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          className="sr-only"
        />
        <label
          htmlFor={inputId}
          className={cn(
            'flex h-4 w-4 items-center justify-center rounded border cursor-pointer transition-all',
            isChecked
              ? 'bg-[var(--accent)] border-[var(--accent)]'
              : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--accent)]',
            error && !isChecked && 'border-[var(--danger)]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {isChecked && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </label>
      </div>
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label htmlFor={inputId} className={cn('text-sm font-medium text-[var(--text-primary)] cursor-pointer', disabled && 'cursor-not-allowed opacity-50')}>
              {label}
            </label>
          )}
          {description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>}
          {error && <p className="text-xs text-[var(--danger)] mt-0.5">{error}</p>}
        </div>
      )}
    </div>
  );
}
