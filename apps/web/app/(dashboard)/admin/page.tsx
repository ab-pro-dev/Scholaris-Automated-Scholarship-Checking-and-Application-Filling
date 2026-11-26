'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LogIn,
  RefreshCw,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Search,
} from 'lucide-react';
import { AdminAuditLogPageDTO, AdminSystemMetricsDTO } from '@scholaris/types';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

function AdminSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-7 w-52 bg-pebble rounded-lg animate-pulse" />
        <div className="h-4 w-80 max-w-full bg-pebble rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-surface border border-line rounded-2xl p-5 space-y-3">
            <div className="h-4 w-24 bg-pebble rounded animate-pulse" />
            <div className="h-7 w-16 bg-pebble rounded animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-72 bg-surface border border-line rounded-2xl p-6" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [metrics, setMetrics] = useState<AdminSystemMetricsDTO | null>(null);
  const [auditPage, setAuditPage] = useState<AdminAuditLogPageDTO | null>(null);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [appliedAction, setAppliedAction] = useState('');
  const [appliedEntity, setAppliedEntity] = useState('');
  const [page, setPage] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
    try {
      setIsFetching(true);
      setErrorMessage(null);
      const [metricsData, logsData] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminAuditLogs({
          action: appliedAction || undefined,
          entityType: appliedEntity || undefined,
          page,
          limit: 15,
        }),
      ]);
      setMetrics(metricsData);
      setAuditPage(logsData);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load admin telemetry.'
      );
    } finally {
      setIsFetching(false);
    }
  }, [appliedAction, appliedEntity, page]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.role === 'ADMIN') {
      loadAdminData();
    }
  }, [authLoading, isAuthenticated, user?.role, loadAdminData]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedAction(actionFilter.trim());
    setAppliedEntity(entityFilter.trim());
  };

  if (authLoading || (isAuthenticated && user?.role === 'ADMIN' && isFetching && !metrics && !errorMessage)) {
    return <AdminSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-surface border border-line rounded-2xl p-8 shadow-card text-center space-y-4">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Sign in to access system administration
          </h1>
          <p className="text-sm text-ink-muted">
            Admin credentials are required to inspect queue metrics, AI provider telemetry, and audit logs.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-action hover:bg-action-hover text-white text-sm font-medium transition-colors"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-surface border border-line rounded-2xl p-8 shadow-card text-center space-y-4">
          <ShieldAlert className="w-8 h-8 text-danger-text mx-auto" />
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Administrator access required
          </h1>
          <p className="text-sm text-ink-muted">
            Your account does not have permission to view system monitoring or audit logs.
          </p>
          <Link
            href="/applications"
            className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-line bg-surface hover:bg-pebble text-ink text-sm font-medium transition-colors"
          >
            Return to Applications
          </Link>
        </div>
      </div>
    );
  }

  const providerEntries = metrics ? Object.entries(metrics.ai.byProvider) : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            System Monitoring &amp; Audit Logs
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Queue health, browser worker sessions, AI cost/latency metrics, and security audit trail.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadAdminData}
          disabled={isFetching}
          className="h-11 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="error" title="Telemetry error">
          {errorMessage}
        </Alert>
      )}

      {metrics && (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-1">
              <p className="text-xs font-medium text-ink-muted">Users &amp; Applications</p>
              <p className="text-2xl font-bold text-ink tabular-nums">
                {metrics.users.totalUsers}
              </p>
              <p className="text-xs text-ink-muted tabular-nums">
                {metrics.users.submittedApplications} / {metrics.users.totalApplications} submitted
              </p>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-1">
              <p className="text-xs font-medium text-ink-muted">Automation Queue</p>
              <p className="text-2xl font-bold text-ink tabular-nums">
                {metrics.queues.active + metrics.queues.queued}
              </p>
              <p className="text-xs text-ink-muted tabular-nums">
                {metrics.queues.completed} completed · {metrics.queues.failed} failed
              </p>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-1">
              <p className="text-xs font-medium text-ink-muted">Browser Sessions</p>
              <p className="text-2xl font-bold text-ink tabular-nums">
                {metrics.queues.activeBrowserSessions}
              </p>
              <p className="text-xs text-ink-muted tabular-nums">
                {metrics.queues.pausedBrowserSessions} paused for user
              </p>
            </div>

            <div className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-1">
              <p className="text-xs font-medium text-ink-muted">AI Usage &amp; Cost</p>
              <p className="text-2xl font-bold text-ink tabular-nums">
                ${metrics.ai.totalEstimatedCostUSD.toFixed(4)}
              </p>
              <p className="text-xs text-ink-muted tabular-nums">
                {metrics.ai.totalRequests} reqs · {Math.round(metrics.ai.averageLatencyMs)} ms avg
              </p>
            </div>
          </div>

          {/* AI Providers & Failed Jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <section className="lg:col-span-6 bg-surface border border-line rounded-2xl p-5 shadow-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink">AI providers</h2>
                <span className="text-xs text-ink-muted tabular-nums">
                  Fallback {metrics.ai.fallbackRatePercent.toFixed(1)}% · Error {metrics.ai.failureRatePercent.toFixed(1)}%
                </span>
              </div>
              {providerEntries.length === 0 ? (
                <p className="text-sm text-ink-muted">No AI requests logged yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-line text-xs text-ink-muted">
                        <th className="py-2 pr-3 font-medium">Provider</th>
                        <th className="py-2 px-3 font-medium">Requests</th>
                        <th className="py-2 px-3 font-medium">Tokens</th>
                        <th className="py-2 pl-3 font-medium">Cost (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line tabular-nums">
                      {providerEntries.map(([provider, stats]) => (
                        <tr key={provider}>
                          <td className="py-2.5 pr-3 font-medium text-ink">{provider}</td>
                          <td className="py-2.5 px-3 text-ink-muted">{stats.requests}</td>
                          <td className="py-2.5 px-3 text-ink-muted">{stats.tokens.toLocaleString()}</td>
                          <td className="py-2.5 pl-3 text-ink">${stats.costUSD.toFixed(4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="lg:col-span-6 bg-surface border border-line rounded-2xl p-5 shadow-card space-y-4">
              <h2 className="text-base font-semibold text-ink">Recent failed jobs</h2>
              {metrics.queues.recentFailedJobs.length === 0 ? (
                <p className="text-sm text-ink-muted">No failed automation jobs.</p>
              ) : (
                <ul className="space-y-2.5">
                  {metrics.queues.recentFailedJobs.map((job) => (
                    <li
                      key={job.id}
                      className="bg-canvas border border-line rounded-xl p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="danger">{job.type}</Badge>
                        <span className="text-ink-muted tabular-nums">
                          Attempts: {job.attempts}
                        </span>
                      </div>
                      {job.errorLog && (
                        <p className="font-mono text-danger-text break-words">
                          {job.errorLog}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}

      {/* Audit Logs */}
      <section className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h2 className="text-base font-semibold text-ink">Audit trail</h2>
          <form onSubmit={handleFilterSubmit} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Filter action..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 px-3 bg-canvas border border-line rounded-xl text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action"
            />
            <input
              type="text"
              placeholder="Filter entity type..."
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-9 px-3 bg-canvas border border-line rounded-xl text-xs text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action"
            />
            <Button type="submit" variant="secondary" size="sm">
              <Search className="w-3.5 h-3.5 mr-1" />
              Filter
            </Button>
          </form>
        </div>

        {!auditPage || auditPage.logs.length === 0 ? (
          <p className="text-sm text-ink-muted">No audit log entries match your filters.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-line text-xs text-ink-muted">
                    <th className="py-2 pr-3 font-medium">Timestamp</th>
                    <th className="py-2 px-3 font-medium">Action</th>
                    <th className="py-2 px-3 font-medium">Entity</th>
                    <th className="py-2 px-3 font-medium">Actor</th>
                    <th className="py-2 pl-3 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line text-xs">
                  {auditPage.logs.map((log) => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-3 text-ink-muted tabular-nums whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-US', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-ink">{log.action}</td>
                      <td className="py-2.5 px-3 text-ink-muted">{log.entityType}</td>
                      <td className="py-2.5 px-3 text-ink-muted">{log.userEmail || log.userId || 'System'}</td>
                      <td className="py-2.5 pl-3 font-mono text-ink-muted">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {auditPage.meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-ink-muted tabular-nums">
                  Page {auditPage.meta.page} of {auditPage.meta.totalPages} ({auditPage.meta.total} entries)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={auditPage.meta.page <= 1 || isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={auditPage.meta.page >= auditPage.meta.totalPages || isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
