'use client';

import React from 'react';
import { ChevronRight, Layers, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ApplicationDashboardItemDTO } from '@scholaris/types';

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
  const inProgressCount = applications.filter(
    (a) =>
      a.status === 'DRAFT' ||
      a.status === 'PREPARING' ||
      a.status === 'WAITING_FOR_INPUT' ||
      a.status === 'REQUIRES_MANUAL_ACTION' ||
      a.status === 'SUBMISSION_FAILED'
  ).length;
  const reviewApprovalCount = applications.filter(
    (a) =>
      a.status === 'READY_FOR_REVIEW' ||
      a.status === 'AWAITING_APPROVAL' ||
      a.status === 'SUBMITTING'
  ).length;
  const submittedCount = applications.filter((a) => a.status === 'SUBMITTED').length;

  const cards: Array<{
    key: DashboardFilterKey;
    title: string;
    value: number;
    description: string;
    icon: React.ReactNode;
    accentClass: string;
    barColor: string;
    ratio: number;
  }> = [
    {
      key: 'ALL',
      title: 'Total Applications',
      value: totalCount,
      description: 'Active scholarship workflows',
      icon: <Layers className="w-4 h-4 text-slate-700" aria-hidden="true" />,
      accentClass: 'bg-slate-100 text-slate-800',
      barColor: 'bg-slate-900',
      ratio: totalCount > 0 ? 100 : 0,
    },
    {
      key: 'IN_PROGRESS',
      title: 'Under Review / Input',
      value: inProgressCount,
      description: 'Drafts & missing items to resolve',
      icon: <Clock className="w-4 h-4 text-amber-700" aria-hidden="true" />,
      accentClass: 'bg-amber-50 text-amber-800',
      barColor: 'bg-amber-500',
      ratio: totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0,
    },
    {
      key: 'AWAITING_APPROVAL',
      title: 'Awaiting Approval',
      value: reviewApprovalCount,
      description: 'Ready for student sign-off',
      icon: <ShieldCheck className="w-4 h-4 text-blue-700" aria-hidden="true" />,
      accentClass: 'bg-blue-50 text-blue-800',
      barColor: 'bg-blue-600',
      ratio: totalCount > 0 ? Math.round((reviewApprovalCount / totalCount) * 100) : 0,
    },
    {
      key: 'SUBMITTED',
      title: 'Submitted',
      value: submittedCount,
      description: 'Verified & archived with proof',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />,
      accentClass: 'bg-emerald-50 text-emerald-800',
      barColor: 'bg-emerald-600',
      ratio: totalCount > 0 ? Math.round((submittedCount / totalCount) * 100) : 0,
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
            className={`group text-left bg-white rounded-xl p-5 border transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${
              isSelected
                ? 'border-slate-900 shadow-sm'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-600">{card.title}</span>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.accentClass}`}>
                {card.icon}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className="text-3xl font-bold tracking-tight text-slate-900 tabular-nums">
                {card.value}
              </span>
              <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 group-hover:text-slate-900 transition-colors">
                Filter
                <ChevronRight
                  className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">{card.description}</p>

            {/* Proportional share bar */}
            <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${card.barColor}`}
                style={{ width: `${card.ratio}%` }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
