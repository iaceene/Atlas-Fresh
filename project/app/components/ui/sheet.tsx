'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
  side?: 'right' | 'left';
  className?: string;
}

export function Sheet({
  open,
  onOpenChange,
  children,
  side = 'right',
  className,
}: SheetProps) {
  const [isMounted, setIsMounted] = React.useState(open);
  const [isVisible, setIsVisible] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setIsMounted(true);
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    setIsVisible(false);
    const timer = window.setTimeout(() => setIsMounted(false), 300);
    return () => window.clearTimeout(timer);
  }, [open]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onOpenChange]);

  if (!isMounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity duration-300 ease-out',
          isVisible ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed inset-y-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl border-l border-slate-200 transition-all duration-300 ease-out',
          side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
          side === 'right'
            ? isVisible ? 'translate-x-0' : 'translate-x-full'
            : isVisible ? 'translate-x-0' : '-translate-x-full',
          isVisible ? 'opacity-100' : 'opacity-0',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function SheetHeader({
  className,
  children,
  onClose,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between border-b border-slate-200 p-5 bg-slate-50/60',
        className
      )}
      {...props}
    >
      <div className="space-y-1">{children}</div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 cursor-pointer"
          aria-label="Close panel"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-semibold tracking-tight text-slate-900', className)}
      {...props}
    />
  );
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-slate-500', className)}
      {...props}
    />
  );
}

export function SheetContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex-1 overflow-y-auto p-5 space-y-5', className)}
      {...props}
    />
  );
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-end border-t border-slate-200 p-4 bg-slate-50/40 gap-2', className)}
      {...props}
    />
  );
}
