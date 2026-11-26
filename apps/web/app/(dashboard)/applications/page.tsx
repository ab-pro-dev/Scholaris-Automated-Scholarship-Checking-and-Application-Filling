'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { ApplicationDashboardItemDTO } from '@scholaris/types';
import { DashboardKpiCards, DashboardFilterKey } from '@/components/applications/dashboard-kpi-cards';
import { ApplicationsTable } from '@/components/applications/applications-table';
import { DeadlinesWidget } from '@/components/applications/deadlines-widget';

export default function ApplicationsDashboardPage() {
  const [applications, setApplications] = useState<ApplicationDashboardItemDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DashboardFilterKey>('ALL');

  const loadApplications = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await api.listApplications();
      setApplications(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load your applications');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-7 h-7 text-slate-800 animate-spin" aria-hidden="true" />
        <p className="text-sm text-slate-500">Loading your scholarship applications...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Scholarship Applications
          </h1>
          <p className="text-sm text-slate-600">
            Track form completion, upcoming deadlines, student authorization status, and verified submission receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadApplications}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
            Refresh
          </button>

          <Link
            href="/scholarships"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            New Application
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadApplications}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded-md text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Metrics Row */}
      <DashboardKpiCards
        applications={applications}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {/* Main 12-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <ApplicationsTable
            applications={applications}
            activeFilter={activeFilter}
            onSelectFilter={setActiveFilter}
          />
        </div>

        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <DeadlinesWidget applications={applications} />
        </div>
      </div>
    </div>
  );
}
