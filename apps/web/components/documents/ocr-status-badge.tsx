import React from 'react';
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import { OCRStatus } from '@scholaris/types';
import { Badge } from '@/components/ui/badge';

const OCR_META: Record<
  OCRStatus,
  {
    label: string;
    variant: 'verified' | 'warning' | 'danger' | 'neutral';
    icon: React.ComponentType<{ className?: string }>;
    spin?: boolean;
  }
> = {
  COMPLETED: {
    label: 'OCR Ready',
    variant: 'verified',
    icon: CheckCircle2,
  },
  PROCESSING: {
    label: 'Extracting Text',
    variant: 'warning',
    icon: Loader2,
    spin: true,
  },
  PENDING: {
    label: 'OCR Queued',
    variant: 'neutral',
    icon: Clock,
  },
  FAILED: {
    label: 'OCR Failed',
    variant: 'danger',
    icon: AlertCircle,
  },
};

export function OcrStatusBadge({ status }: { status: OCRStatus }) {
  const meta = OCR_META[status] ?? OCR_META.PENDING;
  const Icon = meta.icon;

  return (
    <Badge variant={meta.variant} className="gap-1.5 whitespace-nowrap">
      <Icon className={`w-3.5 h-3.5 shrink-0 ${meta.spin ? 'animate-spin' : ''}`} />
      <span>{meta.label}</span>
    </Badge>
  );
}
