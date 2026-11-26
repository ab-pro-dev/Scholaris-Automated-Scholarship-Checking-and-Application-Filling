'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  LogIn,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import {
  MissingInfoDetailDTO,
  SubmissionStatusDTO,
} from '@scholaris/types';
import { api, ApplicationDetailDTO } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { ApplicationStatusBadge } from '@/components/applications/application-status-badge';
import { VerificationBadge } from '@/components/scholarships/verification-badge';
import { FieldMappingsPanel } from '@/components/applications/field-mappings-panel';
import { MissingInfoPanel } from '@/components/applications/missing-info-panel';

type WorkspaceTab = 'missing' | 'fields';

function WorkspaceSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" aria-busy="true">
      <div className="h-5 w-36 bg-pebble rounded animate-pulse" />
      <div className="h-32 bg-surface border border-line rounded-2xl p-6 space-y-3">
        <div className="h-6 w-2/3 bg-pebble rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-pebble rounded animate-pulse" />
      </div>
      <div className="h-80 bg-surface border border-line rounded-2xl p-6 space-y-3">
        <div className="h-5 w-48 bg-pebble rounded animate-pulse" />
        <div className="h-24 w-full bg-pebble/60 rounded-xl animate-pulse" />
        <div className="h-24 w-full bg-pebble/60 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function ApplicationWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [application, setApplication] = useState<ApplicationDetailDTO | null>(null);
  const [missingItems, setMissingItems] = useState<MissingInfoDetailDTO[]>([]);
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatusDTO | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('missing');
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadWorkspace = useCallback(async () => {
    try {
      setIsFetching(true);
      setErrorMessage(null);
      const [appData, missingData, statusData] = await Promise.all([
        api.getApplication(id),
        api.getMissingInfo(id),
        api.getSubmissionStatus(id),
      ]);
      setApplication(appData);
      setMissingItems(missingData);
      setSubmissionStatus(statusData);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load application workspace.'
      );
    } finally {
      setIsFetching(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadWorkspace();
    }
  }, [authLoading, isAuthenticated, loadWorkspace]);

  if (authLoading || (isAuthenticated && isFetching && !application && !errorMessage)) {
    return <WorkspaceSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-surface border border-line rounded-2xl p-8 shadow-card text-center space-y-4">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Sign in to open this application
          </h1>
          <p className="text-sm text-ink-muted">
            Review mapped form fields, draft essays, and prepare your submission.
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

  const unresolvedCount = missingItems.filter((m) => !m.isResolved).length;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Applications
        </Link>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadWorkspace}
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="error" title="Could not load application">
          {errorMessage}
        </Alert>
      )}

      {application && (
        <>
          {/* Application Header */}
          <section className="bg-surface border border-line rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <ApplicationStatusBadge status={application.status} />
                  <VerificationBadge
                    status={application.scholarship.verificationStatus}
                    score={application.scholarship.verificationScore}
                  />
                </div>
                <h1 className="text-2xl font-bold text-ink tracking-tight">
                  {application.scholarship.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                  <span>{application.scholarship.providerName}</span>
                  <a
                    href={application.scholarship.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-action hover:text-action-hover font-medium"
                  >
                    Official portal
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>

              <Link
                href={`/applications/${id}/review`}
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl bg-action hover:bg-action-hover text-white text-sm font-medium transition-colors shrink-0"
              >
                Review &amp; Authorize
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-line text-sm">
              <div>
                <p className="text-xs font-medium text-ink-muted">Discovered fields</p>
                <p className="font-semibold text-ink tabular-nums mt-0.5">
                  {application.fields.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Mapped fields</p>
                <p className="font-semibold text-ink tabular-nums mt-0.5">
                  {application.fieldMappings.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Unresolved prompts</p>
                <p className="font-semibold text-ink tabular-nums mt-0.5">
                  {unresolvedCount}
                </p>
              </div>
            </div>
          </section>

          {submissionStatus?.submittedAt && (
            <Alert variant="success" title="Application submitted">
              Submitted on{' '}
              {new Date(submissionStatus.submittedAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
              {submissionStatus.confirmationCode
                ? ` · Reference: ${submissionStatus.confirmationCode}`
                : ''}
            </Alert>
          )}

          {application.browserSessions?.[0]?.sessionStatus === 'PAUSED_FOR_USER' && (
            <Alert variant="warning" title="Manual portal step needed">
              {application.browserSessions[0].errorMessage ||
                'The scholarship portal requires your direct input (such as login or CAPTCHA).'}
            </Alert>
          )}

          {/* Workspace Tabs */}
          <div
            className="bg-surface border border-line rounded-2xl p-2 shadow-card flex flex-wrap gap-1"
            role="tablist"
            aria-label="Application preparation sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'missing'}
              onClick={() => setActiveTab('missing')}
              className={`h-10 px-4 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                activeTab === 'missing'
                  ? 'bg-action-soft text-action'
                  : 'text-ink-muted hover:text-ink hover:bg-pebble'
              }`}
            >
              <span>Missing Information &amp; Essays</span>
              <span className="tabular-nums text-xs px-2 py-0.5 rounded-full bg-surface border border-line">
                {unresolvedCount > 0 ? (
                  `${unresolvedCount} open`
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-verified-text inline" />
                )}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'fields'}
              onClick={() => setActiveTab('fields')}
              className={`h-10 px-4 rounded-xl text-sm font-medium transition-colors inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                activeTab === 'fields'
                  ? 'bg-action-soft text-action'
                  : 'text-ink-muted hover:text-ink hover:bg-pebble'
              }`}
            >
              <span>Mapped Form Fields</span>
              <span className="tabular-nums text-xs px-2 py-0.5 rounded-full bg-surface border border-line">
                {application.fields.length}
              </span>
            </button>
          </div>

          {activeTab === 'missing' ? (
            <MissingInfoPanel
              applicationId={id}
              items={missingItems}
              onUpdated={loadWorkspace}
            />
          ) : (
            <FieldMappingsPanel
              applicationId={id}
              fields={application.fields}
              mappings={application.fieldMappings}
              onMatched={loadWorkspace}
              onMappingUpdated={(updated) => {
                setApplication((prev) => {
                  if (!prev) return prev;
                  const exists = prev.fieldMappings.some(
                    (m) => m.fieldId === updated.fieldId
                  );
                  const nextMappings = exists
                    ? prev.fieldMappings.map((m) =>
                        m.fieldId === updated.fieldId ? { ...m, ...updated } : m
                      )
                    : [...prev.fieldMappings, updated];
                  return { ...prev, fieldMappings: nextMappings };
                });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}
