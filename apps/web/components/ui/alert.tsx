import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

const ALERT_VARIANTS: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'bg-action-soft border-blue-200 text-blue-950',
  success: 'bg-verified-bg border-verified-border text-verified-text',
  warning: 'bg-warning-bg border-warning-border text-warning-text',
  error: 'bg-danger-bg border-danger-border text-danger-text',
};

const ALERT_ICONS: Record<NonNullable<AlertProps['variant']>, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-action shrink-0 mt-0.5" aria-hidden="true" />,
  success: <CheckCircle2 className="w-4 h-4 text-verified-text shrink-0 mt-0.5" aria-hidden="true" />,
  warning: <AlertCircle className="w-4 h-4 text-warning-text shrink-0 mt-0.5" aria-hidden="true" />,
  error: <XCircle className="w-4 h-4 text-danger-text shrink-0 mt-0.5" aria-hidden="true" />,
};

export function Alert({
  variant = 'info',
  title,
  className,
  children,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        'p-3.5 border rounded-xl flex items-start gap-3 text-sm',
        ALERT_VARIANTS[variant],
        className
      )}
      {...props}
    >
      {ALERT_ICONS[variant]}
      <div className="space-y-0.5 flex-1 min-w-0">
        {title && <h3 className="font-semibold text-sm break-words">{title}</h3>}
        <div className="leading-relaxed break-words text-xs sm:text-sm">{children}</div>
      </div>
    </div>
  );
}
