import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-accent',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent text-white',
        secondary: 'border-transparent bg-bg-elevated text-text-secondary',
        destructive: 'border-transparent bg-danger/15 text-danger border-danger/30',
        outline: 'border-border-strong text-text-primary',
        success: 'border-transparent bg-success/15 text-success border-success/30',
        warning: 'border-transparent bg-warning/15 text-warning border-warning/30',
        geo: 'border-transparent bg-geo/15 text-geo border-geo/30',
        critical: 'border-transparent bg-danger/15 text-danger border-danger/30',
        notice: 'border-transparent bg-accent/15 text-accent border-accent/30',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
