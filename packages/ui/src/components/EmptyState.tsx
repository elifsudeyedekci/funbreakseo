import React from 'react';
import { cn } from '../lib/utils';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 rounded-full bg-bg-elevated p-4 text-text-muted">
          {icon}
        </div>
      )}
      <h3 className="mb-2 text-base font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
