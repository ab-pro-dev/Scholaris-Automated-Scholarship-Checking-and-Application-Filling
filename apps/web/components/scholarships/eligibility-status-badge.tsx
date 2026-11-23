import React from 'react';
import { EligibilityStatus } from '@scholaris/types';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface EligibilityStatusBadgeProps {
  status: EligibilityStatus;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function EligibilityStatusBadge({
  status,
  score,
  size = 'md',
  showIcon = true,
  className = '',
}: EligibilityStatusBadgeProps) {
  const getBadgeConfig = () => {
    switch (status) {
      case 'ELIGIBLE':
        return {
          label: 'Eligible',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
          dot: 'bg-emerald-500',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />,
        };
      case 'INELIGIBLE':
        return {
          label: 'Ineligible',
          bg: 'bg-rose-50 text-rose-800 border-rose-200/80',
          dot: 'bg-rose-500',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />,
        };
      case 'INSUFFICIENT_INFO':
      default:
        return {
          label: 'Needs Info',
          bg: 'bg-amber-50 text-amber-800 border-amber-200/80',
          dot: 'bg-amber-500',
          icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />,
        };
    }
  };

  const config = getBadgeConfig();

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1.5',
    md: 'text-xs sm:text-sm px-2.5 py-1 gap-2',
    lg: 'text-sm px-3.5 py-1.5 gap-2.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center font-medium border rounded-full transition-colors ${config.bg} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="font-semibold tabular-nums opacity-90">
          ({Math.round(score)}%)
        </span>
      )}
    </span>
  );
}
