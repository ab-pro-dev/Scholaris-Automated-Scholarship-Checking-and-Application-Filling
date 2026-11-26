'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  ArrowUpDown,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  FileCheck2,
  FolderOpen,
} from 'lucide-react';
import { ApplicationDashboardItemDTO, VerificationStatus } from '@scholaris/types';
import { ApplicationStatusBadge } from './application-status-badge';
import { DashboardFilterKey } from './dashboard-kpi-cards';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ApplicationsTableProps {
  applications: ApplicationDashboardItemDTO[];
  activeFilter: DashboardFilterKey;
  onSelectFilter: (filter: DashboardFilterKey) => void;
}

type SortField = 'updatedAt' | 'deadline' | 'completion';

const FILTER_TABS: Array<{ key: DashboardFilterKey; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'IN_PROGRESS', label: 'Needs Input' },
  { key: 'AWAITING_APPROVAL', label: 'Ready to Sign' },
  { key: 'SUBMITTED', label: 'Submitted' },
];

function VerificationTrustPill({ status }: { status: VerificationStatus }) {
  if (status === 'VERIFIED') {
    return (
      <Badge variant="verified" className="text-[11px] px-2 py-0">
        <ShieldCheck className="w-3 h-3" aria-hidden="true" />
        Verified
      </Badge>
    );
  }
  if (status === 'SUSPICIOUS') {
    return (
      <Badge variant="danger" className="text-[11px] px-2 py-0">
        <ShieldAlert className="w-3 h-3" aria-hidden="true" />
        Suspicious
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="text-[11px] px-2 py-0">
      <AlertTriangle className="w-3 h-3" aria-hidden="true" />
      Uncertain
    </Badge>
  );
}

function DeadlineCell({ deadline }: { deadline: string | null }) {
  if (!deadline) {
    return <span className="text-xs text-ink-muted">Rolling</span>;
  }

  const target = new Date(deadline);
  const now = new Date();
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const formatted = target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (diffDays < 0) {
    return (
      <div className="space-y-0.5">
        <div className="text-xs font-medium text-ink-muted tabular-nums">{formatted}</div>
        <span className="inline-block text-[11px] text-ink-muted">Closed</span>
      </div>
    );
  }

  if (diffDays <= 7) {
    return (
      <div className="space-y-1">
        <div className="text-xs font-medium text-ink tabular-nums">{formatted}</div>
        <Badge variant="warning" className="text-[11px] px-2 py-0 tabular-nums">
          {diffDays === 0 ? 'Due today' : `${diffDays}d left`}
        </Badge>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="text-xs font-medium text-ink tabular-nums">{formatted}</div>
      <span className="inline-block text-[11px] text-ink-muted tabular-nums">
        {diffDays}d left
      </span>
    </div>
  );
}

export function ApplicationsTable({
  applications,
  activeFilter,
  onSelectFilter,
}: ApplicationsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('updatedAt');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredAndSorted = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = applications.filter((app) => {
      if (activeFilter === 'IN_PROGRESS') {
        if (
          ![
            'DRAFT',
            'PREPARING',
            'WAITING_FOR_INPUT',
            'REQUIRES_MANUAL_ACTION',
            'SUBMISSION_FAILED',
          ].includes(app.status)
        ) {
          return false;
        }
      } else if (activeFilter === 'AWAITING_APPROVAL') {
        if (!['READY_FOR_REVIEW', 'AWAITING_APPROVAL', 'SUBMITTING'].includes(app.status)) {
          return false;
        }
      } else if (activeFilter === 'SUBMITTED') {
        if (app.status !== 'SUBMITTED') return false;
      }

      if (q) {
        return (
          app.scholarship.title.toLowerCase().includes(q) ||
          app.scholarship.providerName.toLowerCase().includes(q)
        );
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'deadline') {
        const da = a.scholarship.deadline
          ? new Date(a.scholarship.deadline).getTime()
          : Number.MAX_SAFE_INTEGER;
        const db = b.scholarship.deadline
          ? new Date(b.scholarship.deadline).getTime()
          : Number.MAX_SAFE_INTEGER;
        cmp = da - db;
      } else if (sortBy === 'completion') {
        cmp = a.completionPercentage - b.completionPercentage;
      } else {
        cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [applications, activeFilter, searchQuery, sortBy, sortAsc]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortBy(field);
      setSortAsc(field === 'deadline');
    }
  };

  return (
    <div className="bg-surface border border-line rounded-2xl overflow-hidden shadow-card">
      {/* Toolbar */}
      <div className="p-4 sm:p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Filter applications by status"
          className="inline-flex items-center p-1 bg-pebble rounded-xl border border-line/80 self-start overflow-x-auto max-w-full"
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                type="button"
                aria-selected={isActive}
                onClick={() => onSelectFilter(tab.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
                  isActive
                    ? 'bg-surface text-action shadow-card'
                    : 'text-ink-muted hover:text-ink'
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search
            className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scholarship or provider..."
            aria-label="Search applications"
            className="w-full pl-9 pr-3 py-2 text-xs bg-surface border border-line rounded-xl text-ink placeholder:text-ink-muted/75 focus:outline-none focus:ring-2 focus:ring-action focus:border-action transition-colors"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSorted.length === 0 ? (
        <div className="p-10 text-center space-y-3">
          <div className="w-11 h-11 rounded-2xl bg-pebble text-ink-muted flex items-center justify-center mx-auto">
            <FolderOpen className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-semibold text-ink">
              {applications.length === 0
                ? 'No scholarship applications started yet'
                : 'No applications match your filter'}
            </h3>
            <p className="text-xs text-ink-muted">
              {applications.length === 0
                ? 'Paste a scholarship URL into the verifier to check authenticity and eligibility before starting an application.'
                : 'Try clearing your search text or switching back to All applications.'}
            </p>
          </div>
          <div className="pt-1">
            {applications.length === 0 ? (
              <Link
                href="/scholarships"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-action text-white text-xs font-semibold rounded-xl hover:bg-action-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              >
                Verify a Scholarship Link
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  onSelectFilter('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-pebble text-ink text-xs font-semibold rounded-xl hover:bg-line/70 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-line bg-canvas/70 text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                <th className="py-3 px-5">Scholarship</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('completion')}
                    className="inline-flex items-center gap-1 hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:underline"
                  >
                    Completion
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('deadline')}
                    className="inline-flex items-center gap-1 hover:text-ink cursor-pointer focus-visible:outline-none focus-visible:underline"
                  >
                    Deadline
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-3 px-5 text-right">Next Step</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filteredAndSorted.map((app) => {
                const isReviewPhase =
                  app.status === 'READY_FOR_REVIEW' ||
                  app.status === 'AWAITING_APPROVAL' ||
                  app.status === 'SUBMITTED' ||
                  app.status === 'SUBMITTING';

                const actionHref = isReviewPhase
                  ? `/applications/${app.id}/review`
                  : `/applications/${app.id}`;

                const isNeedsAction = app.status !== 'SUBMITTED';
                const actionLabel =
                  app.status === 'SUBMITTED'
                    ? 'View Receipt'
                    : app.status === 'READY_FOR_REVIEW' || app.status === 'AWAITING_APPROVAL'
                      ? 'Review & Sign'
                      : app.status === 'SUBMITTING'
                        ? 'Track Status'
                        : 'Continue';

                return (
                  <tr
                    key={app.id}
                    className="hover:bg-canvas/70 transition-colors duration-150"
                  >
                    <td className="py-4 px-5 align-top">
                      <div className="space-y-1.5 max-w-xs">
                        <Link
                          href={actionHref}
                          className="text-sm font-semibold text-ink hover:text-action transition-colors block truncate focus-visible:outline-none focus-visible:underline"
                        >
                          {app.scholarship.title}
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-ink-muted truncate">
                            {app.scholarship.providerName}
                          </span>
                          <VerificationTrustPill status={app.scholarship.verificationStatus} />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <div className="space-y-1">
                        <ApplicationStatusBadge status={app.status} />
                        {app.unresolvedMissingCount > 0 && app.status !== 'SUBMITTED' && (
                          <p className="text-[11px] text-warning-text font-medium tabular-nums">
                            {app.unresolvedMissingCount} item
                            {app.unresolvedMissingCount === 1 ? '' : 's'} remaining
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top min-w-[140px]">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-ink tabular-nums">
                            {app.completionPercentage}%
                          </span>
                          <span className="text-[11px] text-ink-muted tabular-nums">
                            {app._count.fieldMappings}/{app._count.fields} fields
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-pebble rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-200',
                              app.status === 'SUBMITTED'
                                ? 'bg-emerald-600'
                                : app.completionPercentage === 100
                                  ? 'bg-action'
                                  : 'bg-ink'
                            )}
                            style={{ width: `${app.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 align-top">
                      <DeadlineCell deadline={app.scholarship.deadline} />
                    </td>

                    <td className="py-4 px-5 align-top text-right">
                      <Link
                        href={actionHref}
                        className={cn(
                          'inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                          isNeedsAction
                            ? 'bg-action text-white hover:bg-action-hover shadow-card'
                            : 'bg-pebble text-ink hover:bg-line/70 border border-line'
                        )}
                      >
                        {app.status === 'SUBMITTED' && (
                          <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        <span>{actionLabel}</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
