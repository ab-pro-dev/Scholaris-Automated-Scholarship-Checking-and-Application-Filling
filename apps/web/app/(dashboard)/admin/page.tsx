'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  Cpu,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  Server,
  FileSearch,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { AdminSystemMetricsDTO, AdminAuditLogDTO } from '@scholaris/types';

export default function AdminMonitoringPage() {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<AdminSystemMetricsDTO | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audit filters
  const [actionFilter, setActionFilter] = useState('');
  const [userIdFilter, setUserIdFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const [metricsData, logsData] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminAuditLogs({
          action: actionFilter.trim() || undefined,
          userId: userIdFilter.trim() || undefined,
          entityType: entityFilter.trim() || undefined,
          limit: 50,
        }),
      ]);
      setMetrics(metricsData);
      setAuditLogs(logsData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to load system monitoring metrics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadDashboard();
    } else {
      setIsLoading(false);
    }
  }, [user?.role]);

  if (user && user.role !== 'ADMIN') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-base font-bold text-red-950">Administrator Access Required</h1>
            <p className="text-sm text-red-800">
              System monitoring, queue health, and audit logs are restricted to administrator accounts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-7 h-7 text-slate-800 animate-spin" aria-hidden="true" />
        <p className="text-sm text-slate-500">Loading system telemetry and audit logs...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            System Monitoring & Audit Console
          </h1>
          <p className="text-sm text-slate-600">
            Real-time BullMQ automation queue health, Chromium worker sessions, AI provider spend, and security audit trail.
          </p>
        </div>

        <button
          type="button"
          onClick={loadDashboard}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          Refresh Telemetry
        </button>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboard}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md text-xs font-semibold cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {metrics && (
        <>
          {/* Top Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Automation Queue</span>
                <Server className="w-4 h-4 text-slate-500" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {metrics.queues.queued + metrics.queues.active} active / queued
              </div>
              <p className="text-xs text-slate-500 tabular-nums">
                {metrics.queues.completed} completed · {metrics.queues.failed} failed
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Browser Workers</span>
                <Activity className="w-4 h-4 text-blue-600" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {metrics.queues.activeBrowserSessions} running
              </div>
              <p className="text-xs text-slate-500 tabular-nums">
                {metrics.queues.pausedBrowserSessions} paused for student handoff
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>AI Token & Cost Spend</span>
                <Cpu className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                ${metrics.ai.totalEstimatedCostUSD.toFixed(4)}
              </div>
              <p className="text-xs text-slate-500 tabular-nums">
                {metrics.ai.totalTokens.toLocaleString()} tokens across {metrics.ai.totalRequests} calls
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>AI Reliability</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
              </div>
              <div className="text-2xl font-bold text-slate-900 tabular-nums">
                {metrics.ai.averageLatencyMs} ms
              </div>
              <p className="text-xs text-slate-500 tabular-nums">
                {metrics.ai.fallbackRatePercent}% fallback · {metrics.ai.failureRatePercent}% failure
              </p>
            </div>
          </div>

          {/* Middle Grid: AI Providers + Recent Failed Jobs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* AI Provider Breakdown */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">AI Provider Breakdown</h2>
                <span className="text-xs text-slate-500 tabular-nums">
                  {metrics.users.submittedApplications}/{metrics.users.totalApplications} apps submitted
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Provider</th>
                      <th className="py-2.5 px-4 text-right">Requests</th>
                      <th className="py-2.5 px-4 text-right">Tokens</th>
                      <th className="py-2.5 px-4 text-right">Avg Latency</th>
                      <th className="py-2.5 px-4 text-right">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {Object.entries(metrics.ai.byProvider).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-500">
                          No AI requests logged yet.
                        </td>
                      </tr>
                    ) : (
                      Object.entries(metrics.ai.byProvider).map(([provider, stats]) => (
                        <tr key={provider} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-semibold text-slate-900">{provider}</td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700">
                            {stats.requests}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700">
                            {stats.tokens.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-700">
                            {stats.avgLatencyMs} ms
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums font-medium text-slate-900">
                            ${stats.costUSD.toFixed(4)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Failed Jobs */}
            <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">Recent Failed Automation Jobs</h2>
                <span className="text-xs font-medium text-red-700 tabular-nums">
                  {metrics.queues.failed} total failed
                </span>
              </div>
              {metrics.queues.recentFailedJobs.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 flex flex-col items-center gap-1.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                  <span>No failed automation jobs recorded.</span>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {metrics.queues.recentFailedJobs.map((job) => (
                    <li key={job.id} className="p-4 space-y-1 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-slate-900">{job.type}</span>
                        <span className="text-[11px] text-slate-500 tabular-nums">
                          {new Date(job.updatedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-red-700 truncate">
                        {job.errorLog || 'Unknown worker execution error'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* Audit Log Explorer */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FileSearch className="w-4 h-4 text-slate-700" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Security Audit Log Explorer</h2>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              loadDashboard();
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="text"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              placeholder="Filter action (e.g. APPROVE)..."
              aria-label="Filter by action"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <input
              type="text"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              placeholder="Entity (e.g. Application)..."
              aria-label="Filter by entity type"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <input
              type="text"
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
              placeholder="User UUID..."
              aria-label="Filter by user ID"
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              Apply
            </button>
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Entity</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No audit log entries match your filter.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 tabular-nums text-slate-600 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{log.action}</td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.entityType}
                      {log.entityId ? ` (${log.entityId.slice(0, 8)})` : ''}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {log.userEmail || (log.userId ? log.userId.slice(0, 8) : 'System')}
                    </td>
                    <td className="py-3 px-4 tabular-nums text-slate-500">
                      {log.ipAddress || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
