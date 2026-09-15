import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

    const variants = {
      default:
        'bg-slate-900 text-white shadow hover:bg-slate-800 focus-visible:ring-slate-900 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-100',
      destructive:
        'bg-rose-600 text-white shadow-sm hover:bg-rose-700 focus-visible:ring-rose-600',
      outline:
        'border border-slate-200 bg-white shadow-sm hover:bg-slate-50 hover:text-slate-900 text-slate-700 focus-visible:ring-slate-400',
      secondary:
        'bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200/80 focus-visible:ring-slate-400',
      ghost:
        'hover:bg-slate-100 hover:text-slate-900 text-slate-600 focus-visible:ring-slate-400',
      link: 'text-emerald-700 underline-offset-4 hover:underline p-0 h-auto',
    };

    const sizes = {
      default: 'h-9 px-4 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-md px-6 text-base',
      icon: 'h-9 w-9 p-0',
    };

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
