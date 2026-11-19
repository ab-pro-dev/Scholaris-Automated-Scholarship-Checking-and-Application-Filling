'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Calendar,
  DollarSign,
  Building,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  ArrowRight,
  Info,
} from 'lucide-react';
import { ScholarshipWithSources, VerificationResultData } from '../../lib/api';
import { VerificationBadge } from './verification-badge';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert } from '../ui/alert';

export interface VerificationResultCardProps {
  scholarship: ScholarshipWithSources;
  verification?: VerificationResultData | null;
  onReverify?: (scholarshipId: string) => Promise<void>;
  isReverifying?: boolean;
}

export function VerificationResultCard({
  scholarship,
  verification,
  onReverify,
  isReverifying = false,
}: VerificationResultCardProps) {
  const [showEvidence, setShowEvidence] = useState(true);

  const status = verification?.status || scholarship.verificationStatus;
  const score = verification?.confidenceScore ?? scholarship.verificationScore;
  const isSuspicious = status === 'SUSPICIOUS';
  const isVerified = status === 'VERIFIED';
  const isUncertain = status === 'UNCERTAIN';

  const scamFlags = verification?.scamFlags || (scholarship.sources?.[0]?.scamFlagsDetected as string[]) || [];
  const evidenceNotes = verification?.evidenceNotes || scholarship.sources?.[0]?.evidenceNotes || '';
  const summary = verification?.summary || scholarship.verificationSummary || 'No summary available.';
  const institutionMatch = verification?.institutionMatch ?? scholarship.sources?.[0]?.institutionMatch ?? false;

  const domain = (() => {
    try {
      return new URL(scholarship.websiteUrl).hostname;
    } catch {
      return scholarship.websiteUrl;
    }
  })();

  const formatScamFlag = (flag: string) => {
    switch (flag) {
      case 'FEE_REQUIRED':
        return {
          title: 'Upfront Fee Demanded',
          desc: 'Scholarship requires an application, registration, or processing fee to apply.',
        };
      case 'CREDENTIAL_OR_BANKING_REQUEST':
        return {
          title: 'Sensitive Financial / Banking Request',
          desc: 'Requests bank credentials, ATM PIN, or credit card details.',
        };
      case 'SUSPICIOUS_FREE_EMAIL_CONTACT':
        return {
          title: 'Free Email Contact Used',
          desc: 'Claims official affiliation but uses an unverified free email (e.g. @gmail.com).',
        };
      case 'UNREALISTIC_GUARANTEE':
        return {
          title: 'Guaranteed Payout Claim',
          desc: 'Promises guaranteed awards without rigorous academic assessment.',
        };
      case 'DOMAIN_MISMATCH':
        return {
          title: 'Domain Impersonation Mismatch',
          desc: 'Impersonates an established university from an unrelated third-party domain.',
        };
      default:
        return { title: flag, desc: 'Flagged indicator requiring manual review.' };
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden transition-all">
      {/* Top Banner Verdict */}
      <div
        className={`px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isVerified
            ? 'bg-emerald-50/70 border-emerald-100 text-emerald-900'
            : isSuspicious
            ? 'bg-red-50/70 border-red-100 text-red-900'
            : isUncertain
            ? 'bg-amber-50/70 border-amber-100 text-amber-900'
            : 'bg-slate-50 border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex items-center gap-3">
          <VerificationBadge status={status} score={score} size="lg" />
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span>Domain:</span>
            <span className="font-mono text-slate-800 bg-white/80 px-2 py-0.5 rounded-md border border-slate-200/60">
              {domain}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onReverify && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReverify(scholarship.id)}
              disabled={isReverifying}
              className="bg-white hover:bg-slate-50 text-slate-700 text-xs gap-1.5 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReverifying ? 'animate-spin' : ''}`} />
              <span>{isReverifying ? 'Re-Verifying...' : 'Re-verify'}</span>
            </Button>
          )}

          <a
            href={scholarship.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-md text-xs font-medium shadow-2xs transition-colors"
          >
            <span>Visit Site</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </a>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Title & Provider Header */}
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mb-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>{scholarship.providerName}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 tracking-tight">
            {scholarship.title}
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{summary}</p>
        </div>

        {/* Mandatory Safety Rule Callout */}
        {isSuspicious ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-red-800 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-red-600" />
                Automated Form-Filling Strictly Blocked
              </h4>
              <p className="text-xs text-red-700 leading-relaxed">
                This scholarship presents critical scam or fraud red flags (such as upfront payment requests or credential collection).
                To protect your identity and private student documents, Scholaris has disabled automated application assistance for this opportunity.
              </p>
            </div>
          </div>
        ) : isVerified ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3.5 text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <h4 className="font-semibold text-emerald-800">Authentic Opportunity Verified</h4>
              <p className="text-emerald-700 leading-relaxed">
                Corroborated against accredited academic registries. Safe to proceed with eligibility evaluation and application drafting.
              </p>
            </div>
          </div>
        ) : isUncertain ? (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 text-amber-900 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <h4 className="font-semibold text-amber-800">Uncertain / Third-Party Directory</h4>
              <p className="text-amber-700 leading-relaxed">
                This scholarship is listed on an uncorroborated third-party blog or aggregator. We advise independently confirming the deadline with the institution before submitting sensitive records.
              </p>
            </div>
          </div>
        ) : null}

        {/* Verification Metrics & Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Authenticity Score */}
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/60 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Authenticity Score
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-2xl font-serif font-bold tabular-nums ${
                  score >= 70
                    ? 'text-emerald-700'
                    : score <= 30
                    ? 'text-red-700'
                    : 'text-amber-700'
                }`}
              >
                {Math.round(score)}
              </span>
              <span className="text-xs text-slate-400">/ 100</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  score >= 70 ? 'bg-emerald-600' : score <= 30 ? 'bg-red-600' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.max(5, Math.min(100, score))}%` }}
              />
            </div>
          </div>

          {/* Institutional Match */}
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/60 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Institution Match
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              {institutionMatch ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-semibold text-emerald-800">Confirmed Match</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-medium text-slate-600">Uncorroborated</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-2 truncate">
              {institutionMatch ? 'Official domain backing' : 'Third-party listing'}
            </span>
          </div>

          {/* Funding Type */}
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/60 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Funding Type
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <DollarSign className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-800">
                {scholarship.fundingType.replace('_', ' ')}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">Award coverage</span>
          </div>

          {/* Deadline */}
          <div className="bg-slate-50/80 rounded-lg p-3 border border-slate-200/60 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
              Application Deadline
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-800 tabular-nums">
                {scholarship.deadline
                  ? new Date(scholarship.deadline).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Open / Rolling'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-2">Verified date</span>
          </div>
        </div>

        {/* Scam Red Flags Detected */}
        {scamFlags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              Scam & Fraud Risk Signals ({scamFlags.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scamFlags.map((flag, idx) => {
                const info = formatScamFlag(flag);
                return (
                  <div
                    key={idx}
                    className="p-3 bg-red-50/60 border border-red-200/80 rounded-lg text-xs space-y-0.5"
                  >
                    <div className="font-semibold text-red-900 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      {info.title}
                    </div>
                    <p className="text-[11px] text-red-700 leading-normal pl-3">{info.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Collapsible Evidence Notes & Details */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setShowEvidence(!showEvidence)}
            className="w-full px-4 py-3 bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-500" />
              Evidence Notes & Fraud Investigation Report
            </span>
            {showEvidence ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showEvidence && (
            <div className="p-4 bg-white space-y-3 text-xs border-t border-slate-100">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  Analyst Assessment
                </span>
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap bg-slate-50/60 p-3 rounded-md border border-slate-200/60 font-mono text-[11px]">
                  {evidenceNotes || 'No specific evidence notes recorded during ingestion.'}
                </p>
              </div>

              {verification?.aiMetrics && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                  <span>Model: <strong className="text-slate-700">{verification.aiMetrics.model}</strong></span>
                  <span>Latency: <strong className="text-slate-700 tabular-nums">{verification.aiMetrics.latencyMs} ms</strong></span>
                  <span>Tokens: <strong className="text-slate-700 tabular-nums">{verification.aiMetrics.tokensUsed}</strong></span>
                  {verification.aiMetrics.costUSD !== undefined && (
                    <span>Est. Cost: <strong className="text-slate-700 tabular-nums">${verification.aiMetrics.costUSD.toFixed(5)}</strong></span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          <Button
            disabled={isSuspicious}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
              isSuspicious
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
            }`}
          >
            {isSuspicious ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Application Assistance Blocked</span>
              </>
            ) : (
              <>
                <span>Check Eligibility & Requirements</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
