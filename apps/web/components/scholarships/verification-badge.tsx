import React from 'react';
import { ShieldCheck, Clock, HelpCircle, ShieldAlert } from 'lucide-react';
import { VerificationStatus } from '@scholaris/types';
import { Badge } from '@/components/ui/badge';

const STATUS_META: Record<
  VerificationStatus,
  {
    label: string;
    variant: 'verified' | 'warning' | 'danger' | 'neutral';
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  VERIFIED: {
    label: 'Verified',
    variant: 'verified',
    icon: ShieldCheck,
  },
  PENDING: {
    label: 'Pending Check',
    variant: 'neutral',
    icon: Clock,
  },
  UNCERTAIN: {
    label: 'Uncertain',
    variant: 'warning',
    icon: HelpCircle,
  },
  SUSPICIOUS: {
    label: 'Suspicious',
    variant: 'danger',
    icon: ShieldAlert,
  },
};

export function VerificationBadge({
  status,
  score,
}: {
  status: VerificationStatus;
  score?: number;
}) {
  const meta = STATUS_META[status] ?? STATUS_META.PENDING;
  const Icon = meta.icon;

  return (
    <Badge variant={meta.variant} className="gap-1.5 whitespace-nowrap">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{meta.label}</span>
      {typeof score === 'number' && status !== 'PENDING' && (
        <span className="tabular-nums opacity-80">({Math.round(score)}%)</span>
      )}
    </Badge>
  );
}
