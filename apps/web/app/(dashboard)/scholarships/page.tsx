'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Search,
  LogIn,
  Calendar,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { ScholarshipDTO, VerificationStatus } from '@scholaris/types';
import { api, PaginationMeta, ScholarshipDetailDTO } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { VerificationBadge } from '@/components/scholarships/verification-badge';
import { AnalyzeScholarshipPanel } from '@/components/scholarships/analyze-scholarship-panel';
import { ScholarshipDetailPanel } from '@/components/scholarships/scholarship-detail-panel';

type StatusFilter = 'ALL' | VerificationStatus;

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'VERIFIED', label: 'Verified' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'UNCERTAIN', label: 'Uncertain' },
  { key: 'SUSPICIOUS', label: 'Suspicious' },
];

function formatDeadline(deadline?: string | null): string {
  if (!deadline) return 'Rolling';
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return 'Rolling';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ScholarshipsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-pebble rounded-lg animate-pulse" />
        <div className="h-4 w-96 max-w-full bg-pebble rounded-lg animate-pulse" />
      </div>
      <div className="h-32 bg-surface border border-line rounded-2xl p-5 space-y-3">
        <div className="h-5 w-44 bg-pebble rounded animate-pulse" />
        <div className="h-11 w-full bg-pebble rounded-xl animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-52 bg-surface border border-line rounded-2xl p-5 space-y-3">
            <div className="h-5 w-24 bg-pebble rounded-full animate-pulse" />
            <div className="h-5 w-3/4 bg-pebble rounded animate-pulse" />
            <div className="h-4 w-1/2 bg-pebble rounded animate-pulse" />
            <div className="h-10 w-full bg-pebble/60 rounded-xl animate-pulse mt-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ScholarshipsPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [items, setItems] = useState<ScholarshipDTO[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 1,
  });
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadScholarships = useCallback(async () => {
    try {
      setIsFetching(true);
      setErrorMessage(null);
      const res = await api.listScholarships({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: appliedSearch || undefined,
        page,
        limit: 12,
      });
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load scholarships right now.'
      );
    } finally {
      setIsFetching(false);
    }
  }, [statusFilter, appliedSearch, page]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadScholarships();
    }
  }, [authLoading, isAuthenticated, loadScholarships]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(searchInput.trim());
  };

  const handleStatusChange = (nextStatus: StatusFilter) => {
    setStatusFilter(nextStatus);
    setPage(1);
  };

  const handleIngested = (scholarship: ScholarshipDetailDTO) => {
    setSelectedId(scholarship.id);
    loadScholarships();
  };

  const handleUpdated = (updated: ScholarshipDetailDTO) => {
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
    );
  };

  if (authLoading || (isAuthenticated && isFetching && items.length === 0 && !errorMessage)) {
    return <ScholarshipsSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-surface border border-line rounded-2xl p-8 shadow-card text-center space-y-4">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Sign in to verify and explore scholarships
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Inspect scholarship authenticity, extract eligibility criteria, and match opportunities against your verified student profile.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-action hover:bg-action-hover text-white text-sm font-medium transition-colors"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-line bg-surface hover:bg-pebble text-ink text-sm font-medium transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Scholarships
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Inspect scholarship links for authenticity, check eligibility, and launch guided applications.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadScholarships}
          disabled={isFetching}
          className="h-11 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <AnalyzeScholarshipPanel onIngested={handleIngested} />

      {/* Search & Status Filter Bar */}
      <div className="bg-surface border border-line rounded-2xl p-4 shadow-card flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Verification status filter">
          {FILTER_OPTIONS.map((opt) => {
            const active = statusFilter === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => handleStatusChange(opt.key)}
                className={`h-9 px-3.5 rounded-xl text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                  active
                    ? 'bg-action-soft text-action'
                    : 'text-ink-muted hover:text-ink hover:bg-pebble'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full lg:w-96">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-ink-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="scholarship-search-input" className="sr-only">
              Search scholarships
            </label>
            <input
              id="scholarship-search-input"
              type="search"
              placeholder="Search title, provider, or domain..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
            />
          </div>
          <Button type="submit" variant="secondary" className="h-10 px-4 shrink-0">
            Search
          </Button>
        </form>
      </div>

      {errorMessage && (
        <Alert variant="error" title="Failed to load scholarships">
          {errorMessage}
        </Alert>
      )}

      {/* Results Grid */}
      {items.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-10 text-center space-y-3 shadow-card">
          <h2 className="text-base font-semibold text-ink">
            No scholarships match your current view
          </h2>
          <p className="text-sm text-ink-muted max-w-md mx-auto">
            {appliedSearch || statusFilter !== 'ALL'
              ? 'Try clearing your search term or switching back to the All filter.'
              : 'Paste a scholarship URL above to verify its source and check your eligibility.'}
          </p>
          {(appliedSearch || statusFilter !== 'ALL') && (
            <Button
              variant="secondary"
              onClick={() => {
                setSearchInput('');
                setAppliedSearch('');
                setStatusFilter('ALL');
                setPage(1);
              }}
            >
              Reset filters
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((scholarship) => (
            <article
              key={scholarship.id}
              className="bg-surface border border-line rounded-2xl p-5 shadow-card hover:shadow-elevated transition-shadow flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <VerificationBadge
                    status={scholarship.verificationStatus}
                    score={scholarship.verificationScore}
                  />
                  <Badge variant="neutral">
                    {scholarship.fundingType.replace(/_/g, ' ')}
                  </Badge>
                </div>

                <div>
                  <h2 className="text-base font-semibold text-ink leading-snug line-clamp-2">
                    {scholarship.title}
                  </h2>
                  <p className="text-sm text-ink-muted mt-1 truncate">
                    {scholarship.providerName}
                  </p>
                </div>

                {scholarship.verificationSummary && (
                  <p className="text-xs text-ink-muted leading-relaxed line-clamp-2">
                    {scholarship.verificationSummary}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-line space-y-3">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Calendar className="w-3.5 h-3.5" />
                    {formatDeadline(scholarship.deadline)}
                  </span>
                  <a
                    href={scholarship.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-action hover:text-action-hover font-medium"
                  >
                    Source
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <Button
                  variant="secondary"
                  onClick={() => setSelectedId(scholarship.id)}
                  className="w-full h-11"
                >
                  Inspect &amp; Check Eligibility
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-ink-muted tabular-nums">
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} scholarships)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || isFetching}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <ScholarshipDetailPanel
        scholarshipId={selectedId}
        onClose={() => setSelectedId(null)}
        onUpdated={handleUpdated}
      />
    </div>
  );
}
