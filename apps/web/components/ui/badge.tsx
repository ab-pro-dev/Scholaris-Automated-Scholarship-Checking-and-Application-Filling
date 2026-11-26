import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'action' | 'verified' | 'warning' | 'danger';
}

const BADGE_VARIANTS: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-pebble text-ink-muted border-line',
  action: 'bg-action-soft text-action-hover border-blue-200',
  verified: 'bg-verified-bg text-verified-text border-verified-border',
  warning: 'bg-warning-bg text-warning-text border-warning-border',
  danger: 'bg-danger-bg text-danger-text border-danger-border',
};

export function Badge({
  variant = 'neutral',
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap',
        BADGE_VARIANTS[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
