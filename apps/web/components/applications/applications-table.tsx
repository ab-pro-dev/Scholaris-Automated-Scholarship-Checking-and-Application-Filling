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

function VerificationMiniTag({ status }: { status: VerificationStatus }) {
  if (status === 'VERIFIED') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <ShieldCheck className="w-3 h-3" aria-hidden="true" /> Verified
      </span>
    );
  }
  if (status === 'SUSPICIOUS') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <ShieldAlert className="w-3 h-3" aria-hidden="true" /> Suspicious
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Uncertain
    </span>
  );
}

function formatDeadlineBadge(deadline: string | null) {
  if (!deadline) {
    return <span className="text-xs text-slate-400">Rolling</span>;
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
        <div className="text-xs font-medium text-slate-700 tabular-nums">{formatted}</div>
        <span className="inline-block text-[11px] font-medium text-slate-500">Closed</span>
      </div>
    );
  }

  if (diffDays <= 7) {
    return (
      <div className="space-y-0.5">
        <div className="text-xs font-medium text-slate-900 tabular-nums">{formatted}</div>
        <span className="inline-block text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded tabular-nums">
          {diffDays === 0 ? 'Due today' : `${diffDays}d left`}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      <div className="text-xs font-medium text-slate-700 tabular-nums">{formatted}</div>
      <span className="inline-block text-[11px] text-slate-500 tabular-nums">{diffDays}d left</span>
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
        const titleMatch = app.scholarship.title.toLowerCase().includes(q);
        const providerMatch = app.scholarship.providerName.toLowerCase().includes(q);
        return titleMatch || providerMatch;
      }

      return true;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'deadline') {
        const da = a.scholarship.deadline ? new Date(a.scholarship.deadline).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.scholarship.deadline ? new Date(b.scholarship.deadline).getTime() : Number.MAX_SAFE_INTEGER;
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
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
      {/* Toolbar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter applications by status"
          className="inline-flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200/80 self-start"
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
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scholarship or provider..."
            aria-label="Search applications"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredAndSorted.length === 0 ? (
        <div className="p-10 text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <FolderOpen className="w-5 h-5" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-semibold text-slate-900">
              {applications.length === 0
                ? 'No scholarship applications started yet'
                : 'No applications match your filter'}
            </h3>
            <p className="text-xs text-slate-500">
              {applications.length === 0
                ? 'Verify a scholarship link first, check your eligibility, and start an application workflow.'
                : 'Try clearing your search query or switching to All applications.'}
            </p>
          </div>
          <div className="pt-1">
            {applications.length === 0 ? (
              <Link
                href="/scholarships"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
              >
                Verify a Scholarship
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  onSelectFilter('ALL');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Responsive Table */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Scholarship</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('completion')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer focus-visible:outline-none focus-visible:underline"
                  >
                    Completion
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-3 px-4">
                  <button
                    type="button"
                    onClick={() => toggleSort('deadline')}
                    className="inline-flex items-center gap-1 hover:text-slate-900 cursor-pointer focus-visible:outline-none focus-visible:underline"
                  >
                    Deadline
                    <ArrowUpDown className="w-3 h-3" aria-hidden="true" />
                  </button>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAndSorted.map((app) => {
                const isReviewReady =
                  app.status === 'READY_FOR_REVIEW' ||
                  app.status === 'AWAITING_APPROVAL' ||
                  app.status === 'SUBMITTED' ||
                  app.status === 'SUBMITTING';

                const actionHref = isReviewReady
                  ? `/applications/${app.id}/review`
                  : `/applications/${app.id}`;

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
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1 max-w-xs">
                        <Link
                          href={actionHref}
                          className="text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors block truncate"
                        >
                          {app.scholarship.title}
                        </Link>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-500 truncate">
                            {app.scholarship.providerName}
                          </span>
                          <VerificationMiniTag status={app.scholarship.verificationStatus} />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      <div className="space-y-1">
                        <ApplicationStatusBadge status={app.status} />
                        {app.unresolvedMissingCount > 0 && app.status !== 'SUBMITTED' && (
                          <p className="text-[11px] text-amber-700 font-medium tabular-nums">
                            {app.unresolvedMissingCount} item
                            {app.unresolvedMissingCount === 1 ? '' : 's'} remaining
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top min-w-[140px]">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 tabular-nums">
                            {app.completionPercentage}%
                          </span>
                          <span className="text-[11px] text-slate-500 tabular-nums">
                            {app._count.fieldMappings}/{app._count.fields} fields
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              app.status === 'SUBMITTED'
                                ? 'bg-emerald-600'
                                : app.completionPercentage === 100
                                  ? 'bg-blue-600'
                                  : 'bg-slate-900'
                            }`}
                            style={{ width: `${app.completionPercentage}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 align-top">
                      {formatDeadlineBadge(app.scholarship.deadline)}
                    </td>

                    <td className="py-3.5 px-4 align-top text-right">
                      <Link
                        href={actionHref}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 ${
                          app.status === 'SUBMITTED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                            : app.status === 'READY_FOR_REVIEW' || app.status === 'AWAITING_APPROVAL'
                              ? 'bg-slate-900 text-white hover:bg-slate-800'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {app.status === 'SUBMITTED' && (
                          <FileCheck2 className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                        {actionLabel}
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
