import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export function Alert({
  variant = 'info',
  title,
  className,
  children,
  ...props
}: AlertProps) {
  const icons = {
    info: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    warning: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    error: <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
  };

  const variants = {
    info: 'bg-blue-50/80 border-blue-200 text-blue-900',
    success: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50/80 border-amber-200 text-amber-900',
    error: 'bg-red-50/80 border-red-200 text-red-900',
  };

  return (
    <div
      role="alert"
      className={cn(
        'p-3.5 border rounded-lg flex items-start gap-3 text-xs md:text-sm animate-in fade-in-50',
        variants[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="space-y-0.5 flex-1 min-w-0">
        {title && <h5 className="font-semibold break-words">{title}</h5>}
        <div className="leading-relaxed opacity-90 break-words">{children}</div>
      </div>
    </div>
  );
}
