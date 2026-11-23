'use client';

import React from 'react';
import { ScholarshipWithSources } from '../../lib/api';
import { VerificationBadge } from './verification-badge';
import { Building, Calendar, DollarSign, ExternalLink, ArrowRight, ShieldAlert } from 'lucide-react';
import { Button } from '../ui/button';

export interface ScholarshipCardProps {
  scholarship: ScholarshipWithSources;
  isSelected?: boolean;
  onSelect: (scholarship: ScholarshipWithSources) => void;
}

export function ScholarshipCard({
  scholarship,
  isSelected = false,
  onSelect,
}: ScholarshipCardProps) {
  const isSuspicious = scholarship.verificationStatus === 'SUSPICIOUS';

  const domain = (() => {
    try {
      return new URL(scholarship.websiteUrl).hostname;
    } catch {
      return scholarship.websiteUrl;
    }
  })();

  return (
    <div
      onClick={() => onSelect(scholarship)}
      className={`group p-4 sm:p-5 rounded-xl border transition-all cursor-pointer bg-white ${
        isSelected
          ? 'border-slate-900 ring-2 ring-slate-900/10 shadow-sm'
          : isSuspicious
          ? 'border-red-200/90 hover:border-red-300 hover:shadow-xs'
          : 'border-slate-200/80 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 truncate max-w-[200px]">
              <Building className="w-3 h-3 text-slate-400 shrink-0" />
              {scholarship.providerName}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/50">
              {domain}
            </span>
          </div>

          <h3 className="text-base font-serif font-bold text-slate-900 tracking-tight group-hover:text-slate-800 transition-colors line-clamp-1">
            {scholarship.title}
          </h3>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {scholarship.verificationSummary || 'Scholarship opportunity ingested for analysis.'}
          </p>

          <div className="pt-1 flex items-center gap-1 text-[11px] font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors">
            <span>View Details & Eligibility Match</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="shrink-0 flex sm:flex-col items-end justify-between sm:justify-start gap-2">
          <VerificationBadge
            status={scholarship.verificationStatus}
            score={scholarship.verificationScore}
            size="sm"
          />

          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-slate-400" />
              {scholarship.fundingType.replace('_', ' ')}
            </span>
            {scholarship.deadline && (
              <>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1 tabular-nums">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {new Date(scholarship.deadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
