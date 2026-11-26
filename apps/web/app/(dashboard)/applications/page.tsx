'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { RefreshCw, Plus, LogIn } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { ApplicationDashboardItemDTO } from '@scholaris/types';
import {
  DashboardKpiCards,
  DashboardFilterKey,
} from '@/components/applications/dashboard-kpi-cards';
import { ApplicationsTable } from '@/components/applications/applications-table';
import { DeadlinesWidget } from '@/components/applications/deadlines-widget';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" aria-busy="true">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-64 bg-pebble rounded-lg animate-pulse" />
          <div className="h-4 w-96 max-w-full bg-pebble rounded-lg animate-pulse" />
        </div>
        <div className="h-10 w-36 bg-pebble rounded-xl animate-pulse" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-surface border border-line rounded-2xl p-5 space-y-3">
            <div className="h-4 w-28 bg-pebble rounded animate-pulse" />
            <div className="h-8 w-12 bg-pebble rounded animate-pulse" />
            <div className="h-1.5 w-full bg-pebble rounded-full animate-pulse" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 h-80 bg-surface border border-line rounded-2xl p-5 space-y-4">
          <div className="h-9 w-72 bg-pebble rounded-xl animate-pulse" />
          <div className="h-12 w-full bg-pebble/60 rounded-xl animate-pulse" />
          <div className="h-12 w-full bg-pebble/60 rounded-xl animate-pulse" />
          <div className="h-12 w-full bg-pebble/60 rounded-xl animate-pulse" />
        </div>
        <div className="lg:col-span-4 h-64 bg-surface border border-line rounded-2xl p-5 space-y-3">
          <div className="h-5 w-40 bg-pebble rounded animate-pulse" />
          <div className="h-12 w-full bg-pebble/60 rounded-xl animate-pulse" />
          <div className="h-12 w-full bg-pebble/60 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function ApplicationsDashboardPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [applications, setApplications] = useState<ApplicationDashboardItemDTO[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DashboardFilterKey>('ALL');

  const loadApplications = useCallback(async () => {
    try {
      setIsFetching(true);
      setErrorMessage(null);
      const data = await api.listApplications();
      setApplications(data);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load your applications right now.'
      );
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadApplications();
    }
  }, [authLoading, isAuthenticated, loadApplications]);

  if (authLoading || (isAuthenticated && isFetching && applications.length === 0 && !errorMessage)) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-surface border border-line rounded-2xl p-8 shadow-card text-center space-y-4">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Sign in to view your applications
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Access your verified scholarship links, track form completion progress, review AI drafts, and authorize final submissions.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-action text-white rounded-xl text-sm font-semibold hover:bg-action-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
            >
              <LogIn className="w-4 h-4" aria-hidden="true" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-surface border border-line text-ink rounded-xl text-sm font-semibold hover:bg-pebble/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            My Scholarship Applications
          </h1>
          <p className="text-sm text-ink-muted">
            Track form completion, upcoming deadlines, explicit sign-off readiness, and verified receipts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={loadApplications}
            isLoading={isFetching}
          >
            {!isFetching && <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />}
            <span>Refresh</span>
          </Button>

          <Link
            href="/scholarships"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-action text-white rounded-xl text-xs font-semibold hover:bg-action-hover transition-colors shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Check Scholarship</span>
          </Link>
        </div>
      </div>

      {/* Error Recovery */}
      {errorMessage && (
        <Alert variant="error" title="Could not load applications">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>{errorMessage}</span>
            <Button variant="secondary" size="sm" onClick={loadApplications}>
              Retry
            </Button>
          </div>
        </Alert>
      )}

      {/* 4 Filter Summary Cards */}
      <DashboardKpiCards
        applications={applications}
        activeFilter={activeFilter}
        onSelectFilter={setActiveFilter}
      />

      {/* Main Split Workspace */}
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
