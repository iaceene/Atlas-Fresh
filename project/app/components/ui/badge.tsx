import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'positive' | 'warning' | 'destructive' | 'outline';
}

export function Badge({
  className,
  variant = 'default',
  ...props
}: BadgeProps) {
  const variants = {
    default: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-800 border border-slate-200',
    positive: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 font-semibold',
    destructive: 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold',
    outline: 'border border-slate-300 text-slate-700',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide transition-colors whitespace-nowrap',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
