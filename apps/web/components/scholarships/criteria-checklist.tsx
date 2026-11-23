'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  EligibilityCriterionResult,
  RequirementCategory,
} from '@scholaris/types';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  GraduationCap,
  Calendar,
  Globe2,
  Languages,
  BookOpen,
  DollarSign,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

export interface CriteriaChecklistProps {
  criteria: EligibilityCriterionResult[];
  className?: string;
}

export function CriteriaChecklist({ criteria, className = '' }: CriteriaChecklistProps) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'MET' | 'FAILED' | 'MISSING'>('ALL');

  const satisfiedCount = criteria.filter((c) => c.isMet === true).length;
  const failedCount = criteria.filter((c) => c.isMet === false).length;
  const missingCount = criteria.filter((c) => c.isMet === null).length;

  const filteredCriteria = criteria.filter((item) => {
    if (activeFilter === 'MET') return item.isMet === true;
    if (activeFilter === 'FAILED') return item.isMet === false;
    if (activeFilter === 'MISSING') return item.isMet === null;
    return true;
  });

  const getCategoryIcon = (category: RequirementCategory) => {
    switch (category) {
      case 'GPA':
        return <GraduationCap className="w-4 h-4 text-indigo-600" />;
      case 'AGE':
        return <Calendar className="w-4 h-4 text-blue-600" />;
      case 'DEGREE_LEVEL':
        return <BookOpen className="w-4 h-4 text-violet-600" />;
      case 'NATIONALITY':
        return <Globe2 className="w-4 h-4 text-teal-600" />;
      case 'LANGUAGE':
        return <Languages className="w-4 h-4 text-emerald-600" />;
      case 'FIELD':
        return <BookOpen className="w-4 h-4 text-cyan-600" />;
      case 'FINANCIAL':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      case 'OTHER':
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getProfileTargetLink = (missingData?: string | null) => {
    if (!missingData) return { href: '/profile', label: 'Update Profile' };

    switch (missingData) {
      case 'EDUCATION_GPA':
      case 'EDUCATION_LEVEL':
      case 'EDUCATION_FIELD':
        return { href: '/profile?tab=education', label: 'Add Academic History' };
      case 'IELTS_TEST_SCORE':
      case 'TOEFL_TEST_SCORE':
      case 'LANGUAGE_PROFICIENCY':
        return { href: '/profile?tab=languages', label: 'Add Language Score' };
      case 'DATE_OF_BIRTH':
      case 'NATIONALITY':
      case 'FINANCIAL_STATEMENT':
        return { href: '/profile?tab=personal', label: 'Update Personal Info' };
      default:
        return { href: '/profile', label: 'Update Profile' };
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Category filter pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-lg border border-slate-200/70 text-xs">
        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            activeFilter === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All Criteria ({criteria.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('MET')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            activeFilter === 'MET'
              ? 'bg-emerald-50 text-emerald-800 shadow-xs border border-emerald-200/80 font-semibold'
              : 'text-slate-600 hover:text-emerald-700'
          }`}
        >
          Satisfied ({satisfiedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('FAILED')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            activeFilter === 'FAILED'
              ? 'bg-rose-50 text-rose-800 shadow-xs border border-rose-200/80 font-semibold'
              : 'text-slate-600 hover:text-rose-700'
          }`}
        >
          Unfulfilled ({failedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveFilter('MISSING')}
          className={`px-3 py-1.5 rounded-md font-medium transition-all ${
            activeFilter === 'MISSING'
              ? 'bg-amber-50 text-amber-800 shadow-xs border border-amber-200/80 font-semibold'
              : 'text-slate-600 hover:text-amber-700'
          }`}
        >
          Missing Info ({missingCount})
        </button>
      </div>

      {/* Criteria Cards */}
      <div className="space-y-2.5">
        {filteredCriteria.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-sm">
            No requirements match this filter.
          </div>
        ) : (
          filteredCriteria.map((item) => {
            const isMet = item.isMet;
            const link = getProfileTargetLink(item.missingData);

            return (
              <div
                key={item.requirementId}
                className={`p-4 rounded-xl border transition-all ${
                  isMet === true
                    ? 'bg-white border-slate-200/90 hover:border-emerald-200'
                    : isMet === false
                    ? 'bg-rose-50/30 border-rose-200/80'
                    : 'bg-amber-50/30 border-amber-200/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left: Icon & Category info */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 border ${
                        isMet === true
                          ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          : isMet === false
                          ? 'bg-rose-50 border-rose-100 text-rose-700'
                          : 'bg-amber-50 border-amber-100 text-amber-700'
                      }`}
                    >
                      {getCategoryIcon(item.category)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          {item.category.replace('_', ' ')}
                        </span>
                        {item.isMandatory !== false ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-white tracking-wide">
                            Mandatory
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Preferred
                          </span>
                        )}
                        {item.requiredValue && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200/70">
                            {item.operator ? `${item.operator} ` : ''}
                            {item.requiredValue}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-700 font-medium">
                        {item.explanation}
                      </p>

                      {/* Student profile value indicator */}
                      {item.studentValue && (
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                          <span className="font-semibold text-slate-600">Your profile:</span>
                          <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 font-mono">
                            {item.studentValue}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Status badge & One-click profile link */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {isMet === true && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Met
                      </span>
                    )}

                    {isMet === false && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Unfulfilled
                      </span>
                    )}

                    {isMet === null && (
                      <div className="flex flex-col items-start sm:items-end gap-1.5">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          Needs Info
                        </span>
                        <Link
                          href={link.href}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        >
                          <span>{link.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
