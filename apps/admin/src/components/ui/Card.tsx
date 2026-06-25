import { cn } from '@/lib/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  accent?: boolean;
}

export function Card({ children, className, accent = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'relative rounded-xl border bg-[var(--bg-card)]/80 backdrop-blur-sm p-4 transition-all duration-200',
        accent
          ? 'border-[var(--accent)]/20 shadow-[0_0_0_1px_rgba(96,137,240,0.06),0_4px_24px_rgba(0,0,0,0.25)]'
          : 'border-[var(--border-subtle)] shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
        className
      )}
      {...props}
    >
      {accent && (
        <div className="absolute top-0 left-0 right-0 h-px rounded-t-xl bg-gradient-to-r from-transparent via-[var(--accent)]/50 to-transparent" />
      )}
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-semibold text-[var(--text-primary)] tracking-tight', className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn(className)}>{children}</div>;
}
