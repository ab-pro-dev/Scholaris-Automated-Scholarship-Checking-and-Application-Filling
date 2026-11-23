'use client';

import React, { useEffect, useState } from 'react';
import { VerificationStatus } from '@scholaris/types';
import { api, ScholarshipWithSources, VerificationResultData } from '../../../lib/api';
import { ScholarshipAnalyzerForm } from '../../../components/scholarships/scholarship-analyzer-form';
import { VerificationResultCard } from '../../../components/scholarships/verification-result-card';
import { EligibilityReportCard } from '../../../components/scholarships/eligibility-report-card';
import { ScholarshipCard } from '../../../components/scholarships/scholarship-card';
import { VerificationBadge } from '../../../components/scholarships/verification-badge';
import { Alert } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import {
  ShieldCheck,
  Search,
  Filter,
  Loader2,
  RefreshCw,
  Compass,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

export default function ScholarshipsPage() {
  const [scholarships, setScholarships] = useState<ScholarshipWithSources[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isReverifying, setIsReverifying] = useState(false);

  const [selectedScholarship, setSelectedScholarship] = useState<ScholarshipWithSources | null>(null);
  const [activeVerification, setActiveVerification] = useState<VerificationResultData | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const loadScholarships = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listScholarships();
      setScholarships(data || []);
      // If we don't have a selection yet and data exists, select the first one
      if (data && data.length > 0 && !selectedScholarship) {
        setSelectedScholarship(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve scholarships list.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScholarships();
  }, []);

  const handleAnalyze = async (data: { url: string; title?: string; providerName?: string }) => {
    setIsAnalyzing(true);
    setError(null);
    setSuccessNotice(null);

    try {
      // 1. Ingest URL & Extract Initial Metadata
      const ingestRes = await api.analyzeScholarship(data);
      const scholarship = ingestRes.scholarship;

      // 2. Automatically trigger AI verification
      let verificationData: VerificationResultData | null = null;
      try {
        verificationData = await api.verifyScholarship(scholarship.id);
        scholarship.verificationStatus = verificationData.status;
        scholarship.verificationScore = verificationData.confidenceScore;
        scholarship.verificationSummary = verificationData.summary;
      } catch (verifyErr: any) {
        console.warn('Initial verification deferred:', verifyErr.message);
      }

      // Update state
      setSelectedScholarship(scholarship);
      setActiveVerification(verificationData);

      // Prepend or update in list
      setScholarships((prev) => {
        const filtered = prev.filter((s) => s.id !== scholarship.id);
        return [scholarship, ...filtered];
      });

      setSuccessNotice(
        ingestRes.isExisting
          ? 'Retrieved existing scholarship and updated verification analysis.'
          : 'Scholarship ingested and screened successfully.'
      );
    } catch (err: any) {
      setError(err.message || 'Failed to ingest and verify scholarship.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReverify = async (scholarshipId: string) => {
    setIsReverifying(true);
    setError(null);
    try {
      const verification = await api.verifyScholarship(scholarshipId);
      setActiveVerification(verification);

      // Update in scholarships list and active selection
      setScholarships((prev) =>
        prev.map((s) => {
          if (s.id === scholarshipId) {
            return {
              ...s,
              verificationStatus: verification.status,
              verificationScore: verification.confidenceScore,
              verificationSummary: verification.summary,
            };
          }
          return s;
        })
      );

      if (selectedScholarship && selectedScholarship.id === scholarshipId) {
        setSelectedScholarship((prev) =>
          prev
            ? {
                ...prev,
                verificationStatus: verification.status,
                verificationScore: verification.confidenceScore,
                verificationSummary: verification.summary,
              }
            : null
        );
      }

      setSuccessNotice('Verification analysis updated with latest findings.');
    } catch (err: any) {
      setError(err.message || 'Failed to execute verification.');
    } finally {
      setIsReverifying(false);
    }
  };

  const handleSelectScholarship = (scholarship: ScholarshipWithSources) => {
    setSelectedScholarship(scholarship);
    setActiveVerification(null); // Will display scholarship's saved verification state
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filter scholarships list
  const filteredScholarships = scholarships.filter((s) => {
    const matchesStatus =
      statusFilter === 'ALL' || s.verificationStatus === statusFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.websiteUrl.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const filterTabs = [
    { id: 'ALL', label: 'All Opportunities', count: scholarships.length },
    {
      id: 'VERIFIED',
      label: 'Verified',
      count: scholarships.filter((s) => s.verificationStatus === 'VERIFIED').length,
    },
    {
      id: 'UNCERTAIN',
      label: 'Uncertain',
      count: scholarships.filter((s) => s.verificationStatus === 'UNCERTAIN').length,
    },
    {
      id: 'SUSPICIOUS',
      label: 'Suspicious / Blocked',
      count: scholarships.filter((s) => s.verificationStatus === 'SUSPICIOUS').length,
    },
    {
      id: 'PENDING',
      label: 'Pending',
      count: scholarships.filter((s) => s.verificationStatus === 'PENDING').length,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Verification Engine
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 tracking-tight">
            Scholarship Authenticity & Scam Detection
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Ingest scholarship web links with SSRF protection. Scholaris evaluates domain credibility,
            screens for fraudulent upfront fees, and verifies official institutional backing.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadScholarships}
          disabled={isLoading}
          className="self-start sm:self-auto gap-1.5 text-xs bg-white text-slate-700 shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Alert Notices */}
      {error && (
        <div className="relative">
          <Alert variant="error" title="Verification Error">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-xs text-red-600 hover:text-red-900 font-semibold ml-4 underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

      {successNotice && (
        <div className="relative">
          <Alert variant="info" title="Notification">
            <div className="flex items-center justify-between">
              <span>{successNotice}</span>
              <button
                type="button"
                onClick={() => setSuccessNotice(null)}
                className="text-xs text-blue-600 hover:text-blue-900 font-semibold ml-4 underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

      {/* Section 1: Ingestion Form */}
      <ScholarshipAnalyzerForm onAnalyze={handleAnalyze} isLoading={isAnalyzing} />

      {/* Section 2: Active Verification Result Card */}
      {selectedScholarship && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              Active Verification Analysis
            </h2>
            <button
              onClick={() => setSelectedScholarship(null)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Close View
            </button>
          </div>

          <VerificationResultCard
            scholarship={selectedScholarship}
            verification={activeVerification}
            onReverify={handleReverify}
            isReverifying={isReverifying}
          />

          {/* Section 2.5: AI Eligibility Report Card */}
          <EligibilityReportCard
            scholarshipId={selectedScholarship.id}
            scholarshipTitle={selectedScholarship.title}
            verificationStatus={selectedScholarship.verificationStatus}
          />
        </div>
      )}

      {/* Section 3: Recent Ingestions / Catalog List */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-serif font-bold text-slate-900 tracking-tight">
              Ingested Opportunities Catalog
            </h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
              {scholarships.length}
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, provider, domain..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 shadow-2xs"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/70'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  statusFilter === tab.id ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* List of Scholarships */}
        {isLoading ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-2">
            <Loader2 className="w-6 h-6 text-slate-600 animate-spin" />
            <p className="text-xs text-slate-500 font-medium">Loading scholarships catalog...</p>
          </div>
        ) : filteredScholarships.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Compass className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-800">No scholarships found</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                {searchQuery || statusFilter !== 'ALL'
                  ? 'No ingested opportunities match your search filter.'
                  : 'Paste a scholarship webpage URL in the bar above to begin verification.'}
              </p>
            </div>
            {(searchQuery || statusFilter !== 'ALL') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredScholarships.map((s) => (
              <ScholarshipCard
                key={s.id}
                scholarship={s}
                isSelected={selectedScholarship?.id === s.id}
                onSelect={handleSelectScholarship}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
