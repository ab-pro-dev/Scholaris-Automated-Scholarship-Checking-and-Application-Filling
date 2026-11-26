'use client';

import React, { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  LogIn,
  RefreshCw,
  Send,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import {
  ApplicationReviewDTO,
  MappingSourceType,
  SubmissionStatusDTO,
} from '@scholaris/types';
import { approveApplicationSchema } from '@scholaris/validation';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { ApplicationStatusBadge } from '@/components/applications/application-status-badge';

const SOURCE_LABELS: Record<MappingSourceType, string> = {
  PROFILE: 'Profile',
  DOCUMENT: 'Document',
  USER_INPUT: 'Manual Entry',
  AI_DRAFT: 'AI Draft',
};

function ReviewSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" aria-busy="true">
      <div className="h-5 w-44 bg-pebble rounded animate-pulse" />
      <div className="h-36 bg-surface border border-line rounded-2xl p-6 space-y-3">
        <div className="h-6 w-2/3 bg-pebble rounded animate-pulse" />
        <div className="h-4 w-1/3 bg-pebble rounded animate-pulse" />
      </div>
      <div className="h-64 bg-surface border border-line rounded-2xl p-6 space-y-3">
        <div className="h-5 w-48 bg-pebble rounded animate-pulse" />
        <div className="h-16 w-full bg-pebble/60 rounded-xl animate-pulse" />
        <div className="h-16 w-full bg-pebble/60 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

export default function ApplicationReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [review, setReview] = useState<ApplicationReviewDTO | null>(null);
  const [submissionStatus, setSubmissionStatus] =
    useState<SubmissionStatusDTO | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [signature, setSignature] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [busyAction, setBusyAction] = useState<'approve' | 'submit' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const loadReview = useCallback(async () => {
    try {
      setIsFetching(true);
      setErrorMessage(null);
      const [reviewData, statusData] = await Promise.all([
        api.getApplicationReview(id),
        api.getSubmissionStatus(id),
      ]);
      setReview(reviewData);
      setSubmissionStatus(statusData);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load application review.'
      );
    } finally {
      setIsFetching(false);
    }
  }, [id]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadReview();
    }
  }, [authLoading, isAuthenticated, loadReview]);

  const handleAuthorize = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setNoticeMessage(null);

    if (!consentChecked) {
      setErrorMessage('Confirm that you have reviewed all fields before authorizing.');
      return;
    }

    const parsed = approveApplicationSchema.safeParse({
      consentConfirmed: true,
      consentSignature: signature.trim(),
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ||
          'Enter your full name (at least 3 characters) as your authorization signature.'
      );
      return;
    }

    try {
      setBusyAction('approve');
      await api.approveApplication(id, parsed.data);
      setNoticeMessage(
        'Authorization recorded. You may now trigger final submission below.'
      );
      await loadReview();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Authorization failed.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleSubmitApplication = async () => {
    try {
      setBusyAction('submit');
      setErrorMessage(null);
      setNoticeMessage(null);
      const result = await api.submitApplication(id, { confirmed: true });
      setSubmissionStatus(result);
      setNoticeMessage(
        'Final submission job queued. Monitor status updates below.'
      );
      await loadReview();
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Submission request failed.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  if (authLoading || (isAuthenticated && isFetching && !review && !errorMessage)) {
    return <ReviewSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-surface border border-line rounded-2xl p-8 shadow-card text-center space-y-4">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Sign in to review and authorize submission
          </h1>
          <p className="text-sm text-ink-muted">
            Explicit student approval is required before any scholarship application can be submitted.
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

  const isApproved = Boolean(review?.userApprovedAt || submissionStatus?.userApprovedAt);
  const isSubmitted = Boolean(review?.submittedAt || submissionStatus?.submittedAt);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/applications/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </Link>
        <Button
          variant="secondary"
          size="sm"
          onClick={loadReview}
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="error" title="Review notice">
          {errorMessage}
        </Alert>
      )}
      {noticeMessage && (
        <Alert variant="success" title="Updated">
          {noticeMessage}
        </Alert>
      )}

      {review && (
        <>
          {/* Summary Header */}
          <section className="bg-surface border border-line rounded-2xl p-6 shadow-card space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <ApplicationStatusBadge status={review.status} />
                  <Badge variant="neutral" className="tabular-nums">
                    {review.summary.completionPercentage}% complete
                  </Badge>
                </div>
                <h1 className="text-2xl font-bold text-ink tracking-tight">
                  Pre-Submission Review: {review.scholarship.title}
                </h1>
                <p className="text-sm text-ink-muted">
                  {review.scholarship.providerName}
                </p>
              </div>
              <a
                href={review.scholarship.applicationUrl || review.scholarship.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-action hover:text-action-hover px-3 py-2 rounded-xl border border-line hover:bg-action-soft transition-colors"
              >
                Target portal
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-line text-sm">
              <div>
                <p className="text-xs font-medium text-ink-muted">Filled fields</p>
                <p className="font-semibold text-ink tabular-nums mt-0.5">
                  {review.summary.filledFieldsCount} / {review.summary.totalFieldsCount}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Attached documents</p>
                <p className="font-semibold text-ink tabular-nums mt-0.5">
                  {review.attachedDocuments.length}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-ink-muted">Unresolved items</p>
                <p className="font-semibold text-ink tabular-nums mt-0.5">
                  {review.summary.unresolvedCount}
                </p>
              </div>
            </div>
          </section>

          {/* Unresolved Gate Warning */}
          {review.unresolvedMissingItems.length > 0 && (
            <Alert variant="warning" title="Resolve remaining prompts before authorizing">
              <div className="space-y-2">
                <p>
                  {review.unresolvedMissingItems.length} item(s) still need your input in the workspace before final authorization can be unlocked:
                </p>
                <ul className="list-disc list-inside text-xs space-y-1">
                  {review.unresolvedMissingItems.map((item) => (
                    <li key={item.id}>{item.prompt}</li>
                  ))}
                </ul>
                <Link
                  href={`/applications/${id}`}
                  className="inline-flex items-center text-xs font-semibold text-ink underline mt-1"
                >
                  Return to workspace to resolve
                </Link>
              </div>
            </Alert>
          )}

          {/* Field Sections */}
          <div className="space-y-4">
            {review.sections.map((section) => (
              <section
                key={`${section.pageNumber}-${section.name}`}
                className="bg-surface border border-line rounded-2xl p-6 shadow-card space-y-4"
              >
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h2 className="text-base font-semibold text-ink">
                    {section.name}
                  </h2>
                  <Badge variant="neutral">Page {section.pageNumber}</Badge>
                </div>

                <dl className="divide-y divide-line">
                  {section.fields.map((field) => (
                    <div
                      key={field.fieldId}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-2"
                    >
                      <div className="sm:w-1/3 space-y-0.5">
                        <dt className="text-xs font-medium text-ink-muted">
                          {field.label}
                          {field.isRequired ? ' *' : ''}
                        </dt>
                        {field.sourceType && (
                          <span className="inline-block text-xs text-ink-muted">
                            {SOURCE_LABELS[field.sourceType]}
                            {field.isEditedByUser ? ' · Edited' : ''}
                          </span>
                        )}
                      </div>
                      <dd className="sm:w-2/3 text-sm text-ink whitespace-pre-wrap break-words">
                        {field.mappedValue ? (
                          field.mappedValue
                        ) : (
                          <span className="inline-flex items-center gap-1 text-warning-text text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Empty
                          </span>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>

          {/* Attached Documents */}
          <section className="bg-surface border border-line rounded-2xl p-6 shadow-card space-y-4">
            <h2 className="text-base font-semibold text-ink">
              Attached documents
            </h2>
            {review.attachedDocuments.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No documents attached to this application yet.
              </p>
            ) : (
              <ul className="space-y-2">
                {review.attachedDocuments.map((doc) => (
                  <li
                    key={doc.id}
                    className="bg-canvas border border-line rounded-xl px-4 py-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-ink-muted shrink-0" />
                      <span className="font-medium text-ink truncate">
                        {doc.name}
                      </span>
                    </div>
                    <Badge variant="neutral">
                      {doc.category.replace(/_/g, ' ')}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Explicit Human Authorization & Submission Gate */}
          <section className="bg-surface border border-line rounded-2xl p-6 shadow-card space-y-5">
            <div className="flex items-start gap-3 border-b border-line pb-4">
              <ShieldCheck className="w-5 h-5 text-action shrink-0 mt-0.5" />
              <div>
                <h2 className="text-base font-semibold text-ink">
                  Explicit submission authorization
                </h2>
                <p className="text-sm text-ink-muted">
                  Scholaris never submits applications automatically. Review every answer above, sign to authorize, and trigger submission only when you are ready.
                </p>
              </div>
            </div>

            {isSubmitted ? (
              <Alert variant="success" title="Submission recorded">
                Submitted on{' '}
                {new Date(
                  (review.submittedAt || submissionStatus?.submittedAt) as string
                ).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
                {submissionStatus?.confirmationCode
                  ? ` · Reference: ${submissionStatus.confirmationCode}`
                  : ''}
              </Alert>
            ) : isApproved ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-verified-text font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Authorized on{' '}
                    {new Date(
                      (review.userApprovedAt || submissionStatus?.userApprovedAt) as string
                    ).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>

                {submissionStatus?.jobStatus && (
                  <p className="text-xs text-ink-muted">
                    Submission worker status:{' '}
                    <span className="font-mono text-ink">
                      {submissionStatus.jobStatus}
                    </span>
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <p className="text-xs text-ink-muted">
                    Clicking Submit queues the browser worker to finalize submission on the official portal.
                  </p>
                  <Button
                    onClick={handleSubmitApplication}
                    disabled={
                      busyAction !== null || !review.summary.canAuthorizeSubmission
                    }
                    className="h-11 px-6"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {busyAction === 'submit'
                      ? 'Submitting...'
                      : 'Submit Application'}
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAuthorize} className="space-y-4">
                <label className="flex items-start gap-3 text-sm text-ink cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentChecked}
                    onChange={(e) => setConsentChecked(e.target.checked)}
                    disabled={!review.summary.canAuthorizeSubmission}
                    className="mt-1 rounded border-line text-action focus:ring-action"
                  />
                  <span>
                    I confirm that I have reviewed all mapped fields, essays, and attached documents and authorize Scholaris to prepare final submission on my behalf.
                  </span>
                </label>

                <div className="max-w-md">
                  <label
                    htmlFor="consent-signature"
                    className="block text-xs font-medium text-ink-muted mb-1"
                  >
                    Digital signature (type your full name)
                  </label>
                  <input
                    id="consent-signature"
                    type="text"
                    required
                    minLength={3}
                    placeholder="Your Full Name"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    disabled={!review.summary.canAuthorizeSubmission || busyAction !== null}
                    className="w-full h-10 px-3 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      !review.summary.canAuthorizeSubmission || busyAction !== null
                    }
                    className="h-11 px-6"
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    {busyAction === 'approve'
                      ? 'Recording Authorization...'
                      : 'Authorize Submission'}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </>
      )}
    </div>
  );
}
