import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'navy' | 'verified' | 'uncertain' | 'suspicious' | 'outline';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'neutral',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center font-medium rounded-full tracking-wide select-none transition-colors';

  const variants = {
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200/60',
    navy: 'bg-slate-900 text-white border border-slate-800',
    verified: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    uncertain: 'bg-amber-50 text-amber-700 border border-amber-200',
    suspicious: 'bg-red-50 text-red-700 border border-red-200',
    outline: 'bg-transparent text-slate-600 border border-slate-300',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </span>
  );
}
