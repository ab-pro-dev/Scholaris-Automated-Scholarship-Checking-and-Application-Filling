'use client';

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  ExternalLink,
} from 'lucide-react';

interface SubmissionChecklistBannerProps {
  summary: {
    totalFieldsCount: number;
    filledFieldsCount: number;
    unresolvedCount: number;
    canAuthorizeSubmission: boolean;
    completionPercentage: number;
  };
  status?: string;
  unresolvedItems?: Array<{
    id: string;
    prompt: string;
    category: string;
    fieldLabel?: string;
  }>;
  onResolveClick?: () => void;
  onAuthorizeClick?: () => void;
  onViewReceiptClick?: () => void;
}

export function SubmissionChecklistBanner({
  summary,
  status,
  unresolvedItems = [],
  onResolveClick,
  onAuthorizeClick,
  onViewReceiptClick,
}: SubmissionChecklistBannerProps) {
  if (status === 'SUBMITTED') {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-xs transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 border border-emerald-700 flex items-center justify-center shrink-0 text-white shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-950">
                  Status: Submitted
                </span>
                <span className="text-xs text-emerald-800 font-medium">
                  Verified & Executed
                </span>
              </div>
              <h2 className="text-lg font-bold text-emerald-950">
                Application Successfully Submitted to Provider Portal
              </h2>
              <p className="text-sm text-emerald-800">
                This application has been formally submitted under your student authorization. Confirmation screenshot proof and reference details are archived.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {onViewReceiptClick && (
              <button
                type="button"
                onClick={onViewReceiptClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-700 text-white rounded-xl text-sm font-semibold hover:bg-emerald-800 transition-colors shadow-xs"
              >
                <ShieldCheck className="w-4 h-4" />
                View Submission Receipt & Proof
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isReady = summary.unresolvedCount === 0;

  if (isReady) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-xs transition-all">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 text-emerald-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-200 text-emerald-900">
                  Ready for Review & Authorization
                </span>
                <span className="text-xs text-emerald-700 font-medium">
                  100% Complete ({summary.filledFieldsCount}/{summary.totalFieldsCount} Fields)
                </span>
              </div>
              <h2 className="text-lg font-bold text-emerald-950">
                Application Verified & Ready for Student Authorization
              </h2>
              <p className="text-sm text-emerald-800">
                All form fields, essays, and required documents have been verified. In accordance with the{' '}
                <strong>Mandatory Submission Rule</strong>, Scholaris will never submit without your explicit consent.
              </p>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {onAuthorizeClick && (
              <button
                type="button"
                onClick={onAuthorizeClick}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
              >
                <Lock className="w-4 h-4" />
                Authorize Submission
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-xs transition-all">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 text-amber-700">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
                Action Required ({summary.unresolvedCount} Unresolved)
              </span>
              <span className="text-xs text-amber-800">
                {summary.completionPercentage}% Complete ({summary.filledFieldsCount}/{summary.totalFieldsCount} Fields)
              </span>
            </div>
            <h2 className="text-lg font-bold text-amber-950">
              Outstanding Mandatory Requirements
            </h2>
            <p className="text-sm text-amber-800">
              Some mandatory fields or documents still need your attention before this application can be finalized.
            </p>

            {unresolvedItems.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {unresolvedItems.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 text-xs text-amber-900 bg-amber-100/60 px-3 py-1.5 rounded-lg border border-amber-200/80"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="font-medium">{item.fieldLabel || item.category}:</span>
                    <span className="truncate">{item.prompt}</span>
                  </div>
                ))}
                {unresolvedItems.length > 3 && (
                  <p className="text-xs text-amber-700 font-medium pl-2">
                    +{unresolvedItems.length - 3} more unresolved items
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          {onResolveClick && (
            <button
              type="button"
              onClick={onResolveClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl text-sm font-semibold hover:bg-amber-700 transition-colors shadow-xs"
            >
              Resolve in Workspace
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
