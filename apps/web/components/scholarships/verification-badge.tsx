import React from 'react';
import { VerificationStatus } from '@scholaris/types';
import { ShieldCheck, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface VerificationBadgeProps {
  status: VerificationStatus;
  score?: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VerificationBadge({
  status,
  score,
  showIcon = true,
  size = 'md',
  className,
}: VerificationBadgeProps) {
  const configs = {
    VERIFIED: {
      label: 'Authenticity Verified',
      icon: ShieldCheck,
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      iconColor: 'text-emerald-600',
    },
    UNCERTAIN: {
      label: 'Uncertain / Third-Party',
      icon: AlertTriangle,
      classes: 'bg-amber-50 text-amber-800 border-amber-200/80',
      iconColor: 'text-amber-600',
    },
    SUSPICIOUS: {
      label: 'Scam Risk / Suspicious',
      icon: ShieldAlert,
      classes: 'bg-red-50 text-red-800 border-red-200/80',
      iconColor: 'text-red-600',
    },
    PENDING: {
      label: 'Pending Verification',
      icon: Clock,
      classes: 'bg-slate-100 text-slate-700 border-slate-200',
      iconColor: 'text-slate-500',
    },
  };

  const config = configs[status] || configs.PENDING;
  const IconComponent = config.icon;

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1 font-medium',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border tracking-wide transition-colors select-none',
        config.classes,
        sizeStyles[size],
        className
      )}
    >
      {showIcon && <IconComponent className={cn(iconSizes[size], config.iconColor, 'shrink-0')} />}
      <span>{config.label}</span>
      {score !== undefined && score > 0 && (
        <span className="font-mono text-[10px] opacity-80 pl-0.5 tabular-nums">
          ({Math.round(score)}%)
        </span>
      )}
    </span>
  );
}
