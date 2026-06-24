'use client';
import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../utils';

interface Step {
  id: string;
  title: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function Stepper({ steps, currentStep, className, orientation = 'horizontal' }: StepperProps) {
  if (orientation === 'vertical') {
    return (
      <div className={cn('flex flex-col gap-0', className)}>
        {steps.map((step, index) => {
          const isDone = index < currentStep;
          const isActive = index === currentStep;
          return (
            <div key={step.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors', isDone ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : isActive ? 'border-[var(--accent)] text-[var(--accent)] bg-transparent' : 'border-[var(--border-strong)] text-[var(--text-muted)] bg-transparent')}>
                  {isDone ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
                </div>
                {index < steps.length - 1 && <div className={cn('w-0.5 flex-1 my-1', isDone ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]')} style={{ minHeight: 24 }} />}
              </div>
              <div className="pb-6">
                <p className={cn('text-sm font-medium', isActive ? 'text-[var(--text-primary)]' : isDone ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]')}>{step.title}</p>
                {step.description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{step.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', className)}>
      {steps.map((step, index) => {
        const isDone = index < currentStep;
        const isActive = index === currentStep;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center gap-1">
              <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors', isDone ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : isActive ? 'border-[var(--accent)] text-[var(--accent)] bg-transparent' : 'border-[var(--border-strong)] text-[var(--text-muted)] bg-transparent')}>
                {isDone ? <Check className="h-4 w-4" /> : <span>{index + 1}</span>}
              </div>
              <span className={cn('text-xs font-medium whitespace-nowrap', isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]')}>{step.title}</span>
            </div>
            {index < steps.length - 1 && (
              <div className={cn('h-0.5 flex-1 mx-2 mb-4 transition-colors', isDone ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]')} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
