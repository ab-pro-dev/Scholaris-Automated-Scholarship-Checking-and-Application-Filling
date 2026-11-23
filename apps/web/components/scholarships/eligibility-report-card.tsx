'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  EligibilityResultDTO,
  VerificationStatus,
} from '@scholaris/types';
import { api } from '../../lib/api';
import { EligibilityStatusBadge } from './eligibility-status-badge';
import { CriteriaChecklist } from './criteria-checklist';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import {
  Sparkles,
  RefreshCw,
  Lock,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  FileQuestion,
  GraduationCap,
} from 'lucide-react';

export interface EligibilityReportCardProps {
  scholarshipId: string;
  scholarshipTitle: string;
  verificationStatus: VerificationStatus;
  initialResult?: EligibilityResultDTO | null;
  onEligibilityChecked?: (result: EligibilityResultDTO) => void;
  className?: string;
}

export function EligibilityReportCard({
  scholarshipId,
  scholarshipTitle,
  verificationStatus,
  initialResult = null,
  onEligibilityChecked,
  className = '',
}: EligibilityReportCardProps) {
  const [result, setResult] = useState<EligibilityResultDTO | null>(initialResult);
  const [isLoading, setIsLoading] = useState(!initialResult);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuspicious = verificationStatus === 'SUSPICIOUS';

  // Fetch existing evaluation on mount if not provided
  useEffect(() => {
    let isMounted = true;

    if (!isSuspicious && !initialResult) {
      setIsLoading(true);
      api
        .getEligibility(scholarshipId)
        .then((data) => {
          if (isMounted) {
            setResult(data);
          }
        })
        .catch((err) => {
          console.warn('Could not fetch existing eligibility:', err.message);
        })
        .finally(() => {
          if (isMounted) {
            setIsLoading(false);
          }
        });
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [scholarshipId, isSuspicious, initialResult]);

  const handleCheckEligibility = async () => {
    setIsChecking(true);
    setError(null);
    try {
      const evaluation = await api.checkEligibility(scholarshipId);
      setResult(evaluation);
      if (onEligibilityChecked) {
        onEligibilityChecked(evaluation);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate eligibility.');
    } finally {
      setIsChecking(false);
    }
  };

  // SAFETY GATING: Blocked for SUSPICIOUS opportunities
  if (isSuspicious) {
    return (
      <div className={`bg-rose-50/50 border border-rose-200 rounded-xl p-5 sm:p-6 space-y-4 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-100 text-rose-700">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-rose-900 flex items-center gap-2">
              Eligibility Evaluation Blocked
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-200/80 text-rose-900 font-bold">
                SAFETY LOCK
              </span>
            </h3>
            <p className="text-xs text-rose-700 mt-0.5">
              This scholarship has been classified as <strong>SUSPICIOUS</strong>. Automated eligibility checks and application filling are strictly prevented.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden ${className}`}>
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-md bg-indigo-50 border border-indigo-100 text-indigo-700">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900">
              Academic & Eligibility Report
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic evaluation against verified admissions prerequisites
            </p>
          </div>
        </div>

        {result && (
          <div className="flex items-center gap-2">
            <EligibilityStatusBadge status={result.status} score={result.score} size="md" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckEligibility}
              disabled={isChecking}
              className="h-8 gap-1.5 text-xs text-slate-600 hover:text-slate-900"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Re-check</span>
            </Button>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {error && (
          <Alert variant="error" className="mb-4">
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
            <p className="text-sm font-medium">Checking eligibility profile...</p>
          </div>
        ) : !result ? (
          /* Empty / Unchecked State */
          <div className="py-8 px-4 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-slate-900">
                Check Your Eligibility
              </h4>
              <p className="text-xs sm:text-sm text-slate-600">
                Compare your saved GPA, education level, nationality, age, and language scores with this scholarship’s verified requirements.
              </p>
            </div>
            <Button
              onClick={handleCheckEligibility}
              disabled={isChecking}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <Sparkles className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Evaluating Match...' : 'Check My Eligibility'}</span>
            </Button>
          </div>
        ) : (
          /* Evaluated State */
          <div className="space-y-6">
            {/* Verdict Hero Banner */}
            <div
              className={`p-4 sm:p-5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                result.status === 'ELIGIBLE'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : result.status === 'INELIGIBLE'
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.status === 'ELIGIBLE' && (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                )}
                {result.status === 'INELIGIBLE' && (
                  <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                )}
                {result.status === 'INSUFFICIENT_INFO' && (
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                )}

                <div className="space-y-1">
                  <h4 className="text-sm sm:text-base font-bold">
                    {result.status === 'ELIGIBLE'
                      ? 'You are Eligible to Apply'
                      : result.status === 'INELIGIBLE'
                      ? 'Academic Prerequisite Gap Detected'
                      : 'More Information Needed to Confirm Match'}
                  </h4>
                  <p className="text-xs sm:text-sm opacity-90 leading-relaxed font-normal">
                    {result.summary?.summary ||
                      'Evaluation complete based on your student profile.'}
                  </p>
                </div>
              </div>

              {/* Match Score Display */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center bg-white/80 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-black/5 shadow-2xs">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    Match Score
                  </div>
                  <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 leading-none">
                    {Math.round(result.score)}%
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70">
                <div className="text-[11px] text-slate-500 font-medium">Total Criteria</div>
                <div className="text-lg font-bold text-slate-900 font-mono">
                  {result.criteriaBreakdown.length}
                </div>
              </div>
              <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
                <div className="text-[11px] text-emerald-700 font-medium">Satisfied</div>
                <div className="text-lg font-bold text-emerald-800 font-mono">
                  {result.summary?.satisfiedCount ??
                    result.criteriaBreakdown.filter((c) => c.isMet === true).length}
                </div>
              </div>
              <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
                <div className="text-[11px] text-rose-700 font-medium">Unfulfilled</div>
                <div className="text-lg font-bold text-rose-800 font-mono">
                  {result.summary?.failedCount ??
                    result.criteriaBreakdown.filter((c) => c.isMet === false).length}
                </div>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                <div className="text-[11px] text-amber-700 font-medium">Missing Info</div>
                <div className="text-lg font-bold text-amber-800 font-mono">
                  {result.summary?.unconfirmedCount ??
                    result.criteriaBreakdown.filter((c) => c.isMet === null).length}
                </div>
              </div>
            </div>

            {/* Missing Info Callout */}
            {result.summary?.missingProfileFields &&
              result.summary.missingProfileFields.length > 0 && (
                <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Missing from your profile:{' '}
                      <strong className="font-semibold">
                        {result.summary.missingProfileFields.join(', ')}
                      </strong>
                    </span>
                  </div>
                  <Link
                    href="/profile"
                    className="inline-flex items-center gap-1.5 font-bold text-blue-700 hover:text-blue-800 shrink-0"
                  >
                    <span>Update Student Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

            {/* Criteria Breakdown Checklist */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Criteria Breakdown & Explanations
              </h4>
              <CriteriaChecklist criteria={result.criteriaBreakdown} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
