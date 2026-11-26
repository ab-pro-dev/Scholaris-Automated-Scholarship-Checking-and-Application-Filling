'use client';

import React from 'react';
import {
  FileText,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { ApplicationStatus } from '@scholaris/types';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; className: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Draft',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <FileText className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  PREPARING: {
    label: 'Preparing',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />,
  },
  WAITING_FOR_INPUT: {
    label: 'Needs Input',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  REQUIRES_MANUAL_ACTION: {
    label: 'Manual Action',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  READY_FOR_REVIEW: {
    label: 'Ready for Review',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  AWAITING_APPROVAL: {
    label: 'Awaiting Approval',
    className: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    icon: <Lock className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  SUBMITTING: {
    label: 'Submitting',
    className: 'bg-blue-50 text-blue-800 border-blue-200',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />,
  },
  SUBMITTED: {
    label: 'Submitted',
    className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  SUBMISSION_FAILED: {
    label: 'Submission Failed',
    className: 'bg-red-50 text-red-800 border-red-200',
    icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />,
  },
};

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${config.className}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </span>
  );
}
