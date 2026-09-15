import React from 'react';
import { Card } from '../ui/card';
import { cn } from '@/lib/utils';

export interface KpiCardProps {
  id?: string;
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  variant?: 'default' | 'positive' | 'warning' | 'neutral';
  highlight?: boolean;
}

export function KpiCard({
  id,
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  highlight = false,
}: KpiCardProps) {
  const variantStyles = {
    default: 'border-slate-200 bg-white text-slate-900',
    positive: 'border-emerald-200/80 bg-emerald-50/40 text-emerald-950',
    warning: 'border-amber-200/80 bg-amber-50/40 text-amber-950',
    neutral: 'border-slate-200 bg-slate-50/60 text-slate-900',
  };

  const iconBgStyles = {
    default: 'bg-slate-100 text-slate-700',
    positive: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    neutral: 'bg-slate-100 text-slate-700',
  };

  return (
    <Card
      id={id}
      className={cn(
        'p-4 transition-all hover:shadow-xs relative overflow-hidden',
        variantStyles[variant],
        highlight && 'ring-1 ring-amber-300'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-slate-500 font-normal">
              {subtitle}
            </p>
          )}
        </div>
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            iconBgStyles[variant]
          )}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}
