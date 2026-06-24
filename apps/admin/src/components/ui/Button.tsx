import { forwardRef } from 'react';
import { cn } from '@/lib/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent',
  secondary: 'bg-[var(--bg-elevated)] hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] border-[var(--border-default)]',
  ghost: 'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-transparent',
  danger: 'bg-red-600 hover:bg-red-500 text-white border-transparent',
  outline: 'bg-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-primary)] border-[var(--border-default)]',
  success: 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent',
};

const sizes = {
  xs: 'h-6 px-2 text-xs gap-1',
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-10 px-5 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'secondary', size = 'md', loading, icon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-base)] disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
