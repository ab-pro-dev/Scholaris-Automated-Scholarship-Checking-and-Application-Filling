'use client';

import React from 'react';
import { Layers, Clock, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { ApplicationDashboardItemDTO } from '@scholaris/types';
import { cn } from '@/lib/utils';

export type DashboardFilterKey = 'ALL' | 'IN_PROGRESS' | 'AWAITING_APPROVAL' | 'SUBMITTED';

interface DashboardKpiCardsProps {
  applications: ApplicationDashboardItemDTO[];
  activeFilter: DashboardFilterKey;
  onSelectFilter: (filter: DashboardFilterKey) => void;
}

export function DashboardKpiCards({
  applications,
  activeFilter,
  onSelectFilter,
}: DashboardKpiCardsProps) {
  const totalCount = applications.length;
  const needsInputCount = applications.filter((a) =>
    [
      'DRAFT',
      'PREPARING',
      'WAITING_FOR_INPUT',
      'REQUIRES_MANUAL_ACTION',
      'SUBMISSION_FAILED',
    ].includes(a.status)
  ).length;
  const readySignCount = applications.filter((a) =>
    ['READY_FOR_REVIEW', 'AWAITING_APPROVAL', 'SUBMITTING'].includes(a.status)
  ).length;
  const submittedCount = applications.filter((a) => a.status === 'SUBMITTED').length;

  const cards: Array<{
    key: DashboardFilterKey;
    title: string;
    value: number;
    helper: string;
    icon: React.ReactNode;
    iconWrap: string;
    barClass: string;
    percent: number;
  }> = [
    {
      key: 'ALL',
      title: 'All Applications',
      value: totalCount,
      helper: 'Tracked scholarship workflows',
      icon: <Layers className="w-4 h-4 text-ink" aria-hidden="true" />,
      iconWrap: 'bg-pebble text-ink',
      barClass: 'bg-ink',
      percent: totalCount > 0 ? 100 : 0,
    },
    {
      key: 'IN_PROGRESS',
      title: 'Needs Input',
      value: needsInputCount,
      helper: 'Drafts & missing items to resolve',
      icon: <Clock className="w-4 h-4 text-warning-text" aria-hidden="true" />,
      iconWrap: 'bg-warning-bg text-warning-text',
      barClass: 'bg-amber-600',
      percent: totalCount > 0 ? Math.round((needsInputCount / totalCount) * 100) : 0,
    },
    {
      key: 'AWAITING_APPROVAL',
      title: 'Ready for Sign-Off',
      value: readySignCount,
      helper: 'Waiting for explicit consent',
      icon: <ShieldCheck className="w-4 h-4 text-action" aria-hidden="true" />,
      iconWrap: 'bg-action-soft text-action',
      barClass: 'bg-action',
      percent: totalCount > 0 ? Math.round((readySignCount / totalCount) * 100) : 0,
    },
    {
      key: 'SUBMITTED',
      title: 'Submitted',
      value: submittedCount,
      helper: 'Confirmed with receipt proof',
      icon: <CheckCircle2 className="w-4 h-4 text-verified-text" aria-hidden="true" />,
      iconWrap: 'bg-verified-bg text-verified-text',
      barClass: 'bg-emerald-600',
      percent: totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const isSelected = activeFilter === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelectFilter(card.key)}
            aria-pressed={isSelected}
            className={cn(
              'group text-left bg-surface rounded-2xl p-5 border transition-all duration-150 cursor-pointer shadow-card',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
              isSelected
                ? 'border-action ring-1 ring-action/20 shadow-elevated'
                : 'border-line hover:border-ink-muted/40'
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink-muted">{card.title}</span>
              <span className={cn('w-8 h-8 rounded-xl flex items-center justify-center', card.iconWrap)}>
                {card.icon}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-3xl font-bold tracking-tight text-ink tabular-nums">
                {card.value}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-semibold transition-colors',
                  isSelected ? 'text-action' : 'text-ink-muted group-hover:text-action'
                )}
              >
                {isSelected ? 'Filtered' : 'Filter'}
                <ChevronRight
                  className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>

            <p className="mt-1 text-xs text-ink-muted">{card.helper}</p>

            <div className="mt-4 h-1.5 w-full bg-pebble rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-200', card.barClass)}
                style={{ width: `${card.percent}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
