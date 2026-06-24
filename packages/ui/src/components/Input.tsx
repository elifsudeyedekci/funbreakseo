'use client';
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../utils';

const inputVariants = cva(
  'flex w-full rounded-md border bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border-[var(--border-subtle)] hover:border-[var(--border-strong)]',
        error: 'border-[var(--danger)] focus-visible:ring-[var(--danger)]',
      },
      inputSize: {
        default: 'h-10',
        sm: 'h-8 text-xs px-2',
        lg: 'h-12 text-base px-4',
      },
    },
    defaultVariants: { variant: 'default', inputSize: 'default' },
  }
);

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, leftIcon, rightIcon, error, label, id, ...props }, ref) => {
    const inputId = id || React.useId();
    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-[var(--text-primary)]">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(inputVariants({ variant: error ? 'error' : variant, inputSize }), leftIcon && 'pl-10', rightIcon && 'pr-10', className)}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
