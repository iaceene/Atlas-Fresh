import * as React from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'info';
}

export function Alert({
  className,
  variant = 'default',
  ...props
}: AlertProps) {
  const variants = {
    default: 'bg-white border-slate-200 text-slate-900',
    destructive: 'border-rose-200 bg-rose-50/70 text-rose-900',
    warning: 'border-amber-200 bg-amber-50/70 text-amber-900',
    info: 'border-blue-200 bg-blue-50/70 text-blue-900',
  };

  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4 text-sm',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn('mb-1 font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <div
      className={cn('text-sm [&_p]:leading-relaxed opacity-90', className)}
      {...props}
    />
  );
}
