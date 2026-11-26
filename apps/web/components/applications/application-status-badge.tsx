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
import { Badge, BadgeProps } from '@/components/ui/badge';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
}

const STATUS_CONFIG: Record<
  ApplicationStatus,
  { label: string; variant: NonNullable<BadgeProps['variant']>; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Draft',
    variant: 'neutral',
    icon: <FileText className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  PREPARING: {
    label: 'Preparing',
    variant: 'neutral',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />,
  },
  WAITING_FOR_INPUT: {
    label: 'Needs Input',
    variant: 'warning',
    icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  REQUIRES_MANUAL_ACTION: {
    label: 'Manual Action',
    variant: 'warning',
    icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  READY_FOR_REVIEW: {
    label: 'Ready for Review',
    variant: 'action',
    icon: <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  AWAITING_APPROVAL: {
    label: 'Awaiting Approval',
    variant: 'action',
    icon: <Lock className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  SUBMITTING: {
    label: 'Submitting',
    variant: 'action',
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />,
  },
  SUBMITTED: {
    label: 'Submitted',
    variant: 'verified',
    icon: <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />,
  },
  SUBMISSION_FAILED: {
    label: 'Submission Failed',
    variant: 'danger',
    icon: <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />,
  },
};

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;

  return (
    <Badge variant={config.variant}>
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}
