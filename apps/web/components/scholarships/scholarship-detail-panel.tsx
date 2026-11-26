'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  X,
  ExternalLink,
  ShieldCheck,
  ListChecks,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import {
  EligibilityRequirementDTO,
  EligibilityResultDTO,
  EligibilityStatus,
} from '@scholaris/types';
import { api, ScholarshipDetailDTO } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { VerificationBadge } from './verification-badge';

interface ScholarshipDetailPanelProps {
  scholarshipId: string | null;
  onClose: () => void;
  onUpdated: (updated: ScholarshipDetailDTO) => void;
}

const ELIGIBILITY_META: Record<
  EligibilityStatus,
  { label: string; variant: 'verified' | 'warning' | 'danger' }
> = {
  ELIGIBLE: { label: 'Eligible', variant: 'verified' },
  INSUFFICIENT_INFO: { label: 'Needs Profile Info', variant: 'warning' },
  INELIGIBLE: { label: 'Not Eligible', variant: 'danger' },
};

function formatDeadline(deadline?: string | null): string {
  if (!deadline) return 'Rolling / Not specified';
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return 'Not specified';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ScholarshipDetailPanel({
  scholarshipId,
  onClose,
  onUpdated,
}: ScholarshipDetailPanelProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<ScholarshipDetailDTO | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResultDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<
    'verify' | 'extract' | 'eligibility' | 'apply' | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const [scholarshipData, eligibilityData] = await Promise.all([
        api.getScholarship(id),
        api.getEligibilityResult(id),
      ]);
      setDetail(scholarshipData);
      setEligibility(eligibilityData);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to load scholarship details.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!scholarshipId) {
      setDetail(null);
      setEligibility(null);
      setError(null);
      return;
    }
    loadDetails(scholarshipId);
  }, [scholarshipId, loadDetails]);

  useEffect(() => {
    if (!scholarshipId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scholarshipId, onClose]);

  if (!scholarshipId) return null;

  const handleVerify = async () => {
    if (!detail) return;
    try {
      setBusyAction('verify');
      setError(null);
      const updated = await api.verifyScholarship(detail.id);
      const refreshed = await api.getScholarship(detail.id);
      setDetail({ ...updated, ...refreshed });
      onUpdated({ ...updated, ...refreshed });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleExtractRequirements = async () => {
    if (!detail) return;
    try {
      setBusyAction('extract');
      setError(null);
      const reqs: EligibilityRequirementDTO[] = await api.extractRequirements(detail.id);
      const next = { ...detail, requirements: reqs };
      setDetail(next);
      onUpdated(next);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract requirements.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleCheckEligibility = async () => {
    if (!detail) return;
    try {
      setBusyAction('eligibility');
      setError(null);
      const result = await api.evaluateEligibility(detail.id);
      setEligibility(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Eligibility check failed.');
    } finally {
      setBusyAction(null);
    }
  };

  const handleStartApplication = async () => {
    if (!detail) return;
    try {
      setBusyAction('apply');
      setError(null);
      await api.createApplication(detail.id);
      router.push('/applications');
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Could not start application.'
      );
      setBusyAction(null);
    }
  };

  const requirements = detail?.requirements ?? [];
  const sources = detail?.sources ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={detail ? detail.title : 'Scholarship details'}
    >
      <div
        className="fixed inset-0 bg-ink/30 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-2xl bg-surface border-l border-line h-full flex flex-col shadow-elevated">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-line">
          <div className="min-w-0 space-y-1">
            <h2 className="text-lg font-semibold text-ink leading-snug">
              {detail ? detail.title : 'Loading scholarship...'}
            </h2>
            {detail && (
              <p className="text-sm text-ink-muted truncate">
                {detail.providerName}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scholarship details"
            className="w-10 h-10 rounded-xl border border-line flex items-center justify-center text-ink-muted hover:text-ink hover:bg-pebble transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {error && (
            <Alert variant="error" title="Action error">
              {error}
            </Alert>
          )}

          {isLoading ? (
            <div className="space-y-4" aria-busy="true">
              <div className="h-24 bg-pebble/70 rounded-2xl animate-pulse" />
              <div className="h-36 bg-pebble/70 rounded-2xl animate-pulse" />
              <div className="h-44 bg-pebble/70 rounded-2xl animate-pulse" />
            </div>
          ) : detail ? (
            <>
              {/* Overview & Verification Card */}
              <section className="bg-canvas border border-line rounded-2xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <VerificationBadge
                    status={detail.verificationStatus}
                    score={detail.verificationScore}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleVerify}
                      disabled={busyAction !== null}
                    >
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                      {busyAction === 'verify'
                        ? 'Verifying...'
                        : detail.verificationStatus === 'PENDING'
                          ? 'Run Verification'
                          : 'Re-verify'}
                    </Button>
                    <a
                      href={detail.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-action hover:text-action-hover px-2.5 py-1.5 rounded-lg hover:bg-action-soft transition-colors"
                    >
                      Official site
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-medium text-ink-muted">Funding</dt>
                    <dd className="font-medium text-ink mt-0.5">
                      {detail.fundingType.replace(/_/g, ' ')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-ink-muted">Deadline</dt>
                    <dd className="font-medium text-ink tabular-nums mt-0.5">
                      {formatDeadline(detail.deadline)}
                    </dd>
                  </div>
                </dl>

                {detail.verificationSummary && (
                  <p className="text-sm text-ink leading-relaxed border-t border-line pt-3">
                    {detail.verificationSummary}
                  </p>
                )}

                {sources.length > 0 && (
                  <div className="border-t border-line pt-3 space-y-2">
                    <p className="text-xs font-medium text-ink-muted">
                      Inspected source domains
                    </p>
                    {sources.map((src) => (
                      <div
                        key={src.id}
                        className="bg-surface border border-line rounded-xl p-3 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-ink truncate">
                            {src.sourceDomain}
                          </span>
                          <Badge variant={src.institutionMatch ? 'verified' : 'warning'}>
                            {src.institutionMatch ? 'Domain matched' : 'Unverified domain'}
                          </Badge>
                        </div>
                        {src.scamFlagsDetected.length > 0 && (
                          <div className="flex items-start gap-1.5 text-danger-text">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>Flags: {src.scamFlagsDetected.join(', ')}</span>
                          </div>
                        )}
                        {src.evidenceNotes && (
                          <p className="text-ink-muted">{src.evidenceNotes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Requirements Extraction */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-ink-muted" />
                    <h3 className="text-base font-semibold text-ink">
                      Eligibility requirements
                    </h3>
                    <Badge variant="neutral" className="tabular-nums">
                      {requirements.length}
                    </Badge>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleExtractRequirements}
                    disabled={busyAction !== null}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    {busyAction === 'extract'
                      ? 'Extracting...'
                      : requirements.length > 0
                        ? 'Refresh Criteria'
                        : 'Extract Requirements'}
                  </Button>
                </div>

                {requirements.length === 0 ? (
                  <div className="bg-canvas border border-line rounded-xl p-4 text-sm text-ink-muted">
                    No structured requirements extracted yet. Click &ldquo;Extract Requirements&rdquo; to parse criteria from the scholarship page.
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {requirements.map((req) => (
                      <li
                        key={req.id}
                        className="bg-surface border border-line rounded-xl p-3 flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium text-ink">
                              {req.category.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-mono text-ink-muted bg-pebble px-2 py-0.5 rounded-md">
                              {req.operator} {req.requiredValue}
                            </span>
                          </div>
                          {req.description && (
                            <p className="text-xs text-ink-muted leading-relaxed">
                              {req.description}
                            </p>
                          )}
                        </div>
                        <Badge variant={req.isMandatory ? 'warning' : 'neutral'}>
                          {req.isMandatory ? 'Mandatory' : 'Preferred'}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Personal Eligibility Match */}
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-ink">
                    Your eligibility match
                  </h3>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={handleCheckEligibility}
                    disabled={busyAction !== null}
                  >
                    {busyAction === 'eligibility'
                      ? 'Evaluating...'
                      : eligibility
                        ? 'Re-check Match'
                        : 'Check My Eligibility'}
                  </Button>
                </div>

                {eligibility ? (
                  <div className="bg-canvas border border-line rounded-2xl p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={ELIGIBILITY_META[eligibility.status].variant}>
                        {ELIGIBILITY_META[eligibility.status].label}
                      </Badge>
                      <span className="text-sm font-semibold text-ink tabular-nums">
                        Match score: {Math.round(eligibility.score)}%
                      </span>
                    </div>

                    {eligibility.summary?.summary && (
                      <p className="text-sm text-ink-muted">
                        {eligibility.summary.summary}
                      </p>
                    )}

                    {eligibility.criteriaBreakdown.length > 0 && (
                      <ul className="space-y-2 pt-1">
                        {eligibility.criteriaBreakdown.map((item) => (
                          <li
                            key={item.requirementId}
                            className="bg-surface border border-line rounded-xl p-3 flex items-start gap-2.5 text-xs"
                          >
                            {item.isMet === true ? (
                              <CheckCircle2 className="w-4 h-4 text-verified-text shrink-0 mt-0.5" />
                            ) : item.isMet === false ? (
                              <XCircle className="w-4 h-4 text-danger-text shrink-0 mt-0.5" />
                            ) : (
                              <HelpCircle className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
                            )}
                            <div className="space-y-0.5">
                              <p className="font-medium text-ink">
                                {item.category.replace(/_/g, ' ')}
                              </p>
                              <p className="text-ink-muted">{item.explanation}</p>
                              {item.missingData && (
                                <p className="text-warning-text font-medium">
                                  Missing: {item.missingData}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="bg-canvas border border-line rounded-xl p-4 text-sm text-ink-muted">
                    Run an eligibility check to compare your profile against this scholarship&apos;s criteria.
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>

        {detail && (
          <div className="px-6 py-4 border-t border-line bg-surface flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-ink-muted">
              Applications always require your explicit review before submission.
            </p>
            <Button
              onClick={handleStartApplication}
              disabled={busyAction !== null}
              className="h-11 px-5"
            >
              {busyAction === 'apply' ? 'Starting...' : 'Start Application'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
