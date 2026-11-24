'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MissingInfoDetailDTO, FieldMatchingSummary } from '@scholaris/types';
import { MissingInfoCard } from '@/components/applications/missing-info-card';
import { FieldMappingsTable } from '@/components/applications/field-mappings-table';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ApplicationDetailPage({ params }: PageProps) {
  const router = useRouter();
  const { id: applicationId } = use(params);

  const [application, setApplication] = useState<any>(null);
  const [missingItems, setMissingItems] = useState<MissingInfoDetailDTO[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [activeTab, setActiveTab] = useState<'missing' | 'mappings'>('missing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [appData, missingData, mappingsData] = await Promise.all([
        api.getApplication(applicationId),
        api.getMissingInfo(applicationId),
        api.getFieldMappings(applicationId),
      ]);

      setApplication(appData);
      setMissingItems(missingData);
      setMappings(mappingsData.mappings || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load application details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [applicationId]);

  const handleRunMatching = async () => {
    try {
      setIsMatching(true);
      setErrorMessage(null);
      await api.matchApplicationFields(applicationId);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Field matching failed');
    } finally {
      setIsMatching(false);
    }
  };

  const unresolvedCount = missingItems.filter((m) => !m.isResolved).length;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500">Loading application workspace...</p>
      </div>
    );
  }

  if (errorMessage && !application) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {errorMessage}
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready for Review
          </span>
        );
      case 'WAITING_FOR_INPUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3.5 h-3.5" /> Missing Information ({unresolvedCount})
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            <Clock className="w-3.5 h-3.5" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Navigation & Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button
          onClick={() => router.push('/scholarships')}
          className="hover:text-slate-800 transition-colors"
        >
          Scholarships
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-medium truncate max-w-sm">
          {application?.scholarship?.title || 'Application Workspace'}
        </span>
      </div>

      {/* Hero Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-3">
            {getStatusBadge(application?.status || 'DRAFT')}
            <span className="text-xs text-slate-500">
              Provider: <strong>{application?.scholarship?.providerName || 'Scholarship Provider'}</strong>
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {application?.scholarship?.title || 'Application Workspace'}
          </h1>
          <p className="text-sm text-slate-600">
            Review discovered form fields, attach required vault documents, and leverage the AI Assistant to draft personalized motivation essays.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/applications/${applicationId}/review`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Review & Finalize
          </button>
          <button
            onClick={handleRunMatching}
            disabled={isMatching}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
          >
            {isMatching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Matching Fields...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Run AI Field Matcher
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {errorMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center gap-8">
        <button
          onClick={() => setActiveTab('missing')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'missing'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-4 h-4" />
          Missing Information & Essays
          {unresolvedCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
              {unresolvedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('mappings')}
          className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'mappings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Verified Field Mappings ({mappings.length})
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'missing' && (
        <MissingInfoCard
          applicationId={applicationId}
          missingItems={missingItems}
          onResolved={loadData}
        />
      )}

      {activeTab === 'mappings' && (
        <FieldMappingsTable
          applicationId={applicationId}
          mappings={mappings}
          onUpdated={loadData}
        />
      )}
    </div>
  );
}
