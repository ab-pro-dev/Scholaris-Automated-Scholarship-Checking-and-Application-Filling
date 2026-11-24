'use client';

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Camera,
  ShieldCheck,
  Calendar,
  Layers,
  ChevronRight,
  ExternalLink,
  Lock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ApplicationReviewDTO } from '@scholaris/types';
import { SubmissionChecklistBanner } from '@/components/applications/submission-checklist-banner';
import { ReviewFieldRow } from '@/components/applications/review-field-row';
import { ReviewDocumentsList } from '@/components/applications/review-documents-list';
import { PortalPreviewModal } from '@/components/applications/portal-preview-modal';
import { AuthorizationModal } from '@/components/applications/authorization-modal';
import { SubmissionProgressModal } from '@/components/applications/submission-progress-modal';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ApplicationReviewPage({ params }: PageProps) {
  const router = useRouter();
  const { id: applicationId } = use(params);

  const [review, setReview] = useState<ApplicationReviewDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScreenshotOpen, setIsScreenshotOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const data = await api.getApplicationReview(applicationId);
      setReview(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load application review data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [applicationId]);

  const handleSaveField = async (fieldId: string, newValue: string) => {
    await api.updateFieldMapping(applicationId, fieldId, newValue);
    await loadData();
  };

  const handleAuthorizeAndSubmit = async (consentData: {
    signature: string;
    consentHash: string;
  }) => {
    await api.approveApplication(applicationId, {
      consentConfirmed: true,
      consentSignature: consentData.signature,
      consentHash: consentData.consentHash,
    });
    setIsAuthModalOpen(false);
    setIsProgressModalOpen(true);
    await api.submitApplication(applicationId, { confirmed: true });
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500">Preparing pre-submission application review...</p>
      </div>
    );
  }

  if (errorMessage && !review) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <button
          type="button"
          onClick={() => router.push(`/applications/${applicationId}`)}
          className="inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Application Workspace
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {errorMessage}
        </div>
      </div>
    );
  }

  if (!review) return null;

  const { summary, scholarship, sections, attachedDocuments, unresolvedMissingItems } = review;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Navigation & Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <button
          type="button"
          onClick={() => router.push('/scholarships')}
          className="hover:text-slate-800 transition-colors"
        >
          Scholarships
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <button
          type="button"
          onClick={() => router.push(`/applications/${applicationId}`)}
          className="hover:text-slate-800 transition-colors truncate max-w-xs"
        >
          {scholarship.title}
        </button>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-medium">Pre-Submission Review</span>
      </div>

      {/* Hero Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-wrap items-start justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> {review.status.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-slate-500">
              Provider: <strong>{scholarship.providerName}</strong>
            </span>
            {scholarship.deadline && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="w-3.5 h-3.5" />
                Deadline: {new Date(scholarship.deadline).toLocaleDateString()}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {scholarship.title} — Application Review
          </h1>
          <p className="text-sm text-slate-600">
            Carefully review all auto-filled fields, personal statements, and attached documents. You can modify any value in-place before proceeding to final authorization.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {review.status === 'SUBMITTED' ? (
            <button
              type="button"
              onClick={() => setIsProgressModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-2xs"
            >
              <ShieldCheck className="w-4 h-4" />
              Submission Receipt
            </button>
          ) : summary.canAuthorizeSubmission ? (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Lock className="w-4 h-4 text-emerald-400" />
              Authorize Submission
            </button>
          ) : null}

          {review.previewScreenshotUrl && (
            <button
              type="button"
              onClick={() => setIsScreenshotOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <Camera className="w-4 h-4 text-indigo-600" />
              View Portal Snapshot
            </button>
          )}

          <button
            type="button"
            onClick={() => router.push(`/applications/${applicationId}`)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Workspace
          </button>
        </div>
      </div>

      {/* Submission Validation Checklist Banner */}
      <SubmissionChecklistBanner
        summary={summary}
        status={review.status}
        unresolvedItems={unresolvedMissingItems}
        onResolveClick={() => router.push(`/applications/${applicationId}`)}
        onAuthorizeClick={() => setIsAuthModalOpen(true)}
        onViewReceiptClick={() => setIsProgressModalOpen(true)}
      />

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Column: Sections with In-Place Editable Fields */}
        <div className="lg:col-span-8 space-y-6">
          {sections.map((section) => (
            <div
              key={section.pageNumber}
              className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden"
            >
              {/* Section Header */}
              <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {section.pageNumber}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {section.name}
                  </h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {section.fields.length} {section.fields.length === 1 ? 'Field' : 'Fields'}
                </span>
              </div>

              {/* Fields List */}
              <div className="divide-y divide-slate-100">
                {section.fields.map((field) => (
                  <ReviewFieldRow
                    key={field.fieldId}
                    field={field}
                    applicationId={applicationId}
                    onSave={handleSaveField}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Attached Documents Section */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Attached Documents & Vault Files ({attachedDocuments.length})
                </h3>
              </div>
            </div>

            <ReviewDocumentsList documents={attachedDocuments} />
          </div>
        </div>

        {/* Right Sticky Sidebar: Progress & Rules */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
          {/* Summary Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Review Summary</h3>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-slate-600 font-medium mb-1.5">
                  <span>Completion Status</span>
                  <span>{summary.completionPercentage}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      summary.completionPercentage === 100
                        ? 'bg-emerald-500'
                        : 'bg-indigo-600'
                    }`}
                    style={{ width: `${summary.completionPercentage}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-lg font-bold text-slate-900">
                    {summary.filledFieldsCount}/{summary.totalFieldsCount}
                  </span>
                  <span className="text-[11px] text-slate-500">Filled Fields</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="block text-lg font-bold text-slate-900">
                    {attachedDocuments.length}
                  </span>
                  <span className="text-[11px] text-slate-500">Documents</span>
                </div>
              </div>
            </div>
          </div>

          {/* Portal Snapshot Preview Widget */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" /> Form Snapshot
              </h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live
              </span>
            </div>

            {review.previewScreenshotUrl ? (
              <div
                onClick={() => setIsScreenshotOpen(true)}
                className="group relative cursor-pointer border border-slate-200 rounded-xl overflow-hidden aspect-video bg-slate-100 shadow-2xs hover:border-indigo-400 transition-all"
              >
                <img
                  src={review.previewScreenshotUrl}
                  alt="Filled form preview thumbnail"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5 backdrop-blur-2xs">
                  <Camera className="w-4 h-4" /> Inspect Snapshot
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1">
                <p className="text-xs text-slate-600 font-medium">Snapshot Pending</p>
                <p className="text-[11px] text-slate-400">
                  Screenshot captured automatically when browser worker fills portal.
                </p>
              </div>
            )}
          </div>

          {/* Mandatory Submission Rule Security Card */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <Lock className="w-4 h-4" />
              Mandatory Submission Rule
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Scholaris will <strong>NEVER</strong> automatically submit an application without your explicit, one-time student confirmation. You retain full ownership and control over your admissions submissions.
            </p>
          </div>
        </div>
      </div>

      {/* Full Screenshot Modal */}
      <PortalPreviewModal
        isOpen={isScreenshotOpen}
        onClose={() => setIsScreenshotOpen(false)}
        screenshotUrl={review.previewScreenshotUrl || null}
        scholarshipTitle={scholarship.title}
        portalUrl={scholarship.websiteUrl || scholarship.applicationUrl || null}
      />

      {/* Mandatory Submission Rule Authorization Gate Modal */}
      <AuthorizationModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthorized={handleAuthorizeAndSubmit}
        scholarshipTitle={scholarship.title}
        providerName={scholarship.providerName}
        deadline={scholarship.deadline}
        totalFieldsCount={summary.totalFieldsCount}
        documentsCount={attachedDocuments.length}
      />

      {/* Live Submission Execution Progress & Receipt Modal */}
      <SubmissionProgressModal
        isOpen={isProgressModalOpen}
        applicationId={applicationId}
        scholarshipTitle={scholarship.title}
        providerName={scholarship.providerName}
        onClose={() => {
          setIsProgressModalOpen(false);
          loadData();
        }}
        onCompleted={() => {
          loadData();
        }}
      />
    </div>
  );
}
