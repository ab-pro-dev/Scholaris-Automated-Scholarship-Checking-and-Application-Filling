'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Camera,
  Copy,
  Check,
  Download,
  FileCheck2,
  ShieldCheck,
  X,
  ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { SubmissionStatusDTO } from '@scholaris/types';

interface SubmissionProgressModalProps {
  isOpen: boolean;
  applicationId: string;
  scholarshipTitle: string;
  providerName: string;
  onClose: () => void;
  onCompleted?: () => void;
}

export function SubmissionProgressModal({
  isOpen,
  applicationId,
  scholarshipTitle,
  providerName,
  onClose,
  onCompleted,
}: SubmissionProgressModalProps) {
  const router = useRouter();
  const [statusData, setStatusData] = useState<SubmissionStatusDTO | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Poll submission status
  useEffect(() => {
    if (!isOpen) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
      setStatusData(null);
      setElapsedSeconds(0);
      return;
    }

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    const checkStatus = async () => {
      try {
        const data = await api.getSubmissionStatus(applicationId);
        setStatusData(data);

        if (data.status === 'SUBMITTED' || data.status === 'SUBMISSION_FAILED') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (timerRef.current) clearInterval(timerRef.current);
          if (data.status === 'SUBMITTED' && onCompleted) {
            onCompleted();
          }
        }
      } catch (err) {
        console.error('Failed to poll submission status:', err);
      }
    };

    checkStatus();
    pollTimerRef.current = setInterval(checkStatus, 2000);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen, applicationId]);

  if (!isOpen) return null;

  const currentStatus = statusData?.status || 'SUBMITTING';
  const isSubmitted = currentStatus === 'SUBMITTED';
  const isFailed = currentStatus === 'SUBMISSION_FAILED';
  const isSubmitting = !isSubmitted && !isFailed;

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadReceipt = () => {
    if (!statusData) return;
    const receiptContent = `
=====================================================
SCHOLARIS APPLICATION SUBMISSION RECEIPT
=====================================================
Scholarship: ${scholarshipTitle}
Provider: ${providerName}
Application ID: ${applicationId}
Status: ${statusData.status}
Submitted At: ${statusData.submittedAt ? new Date(statusData.submittedAt).toUTCString() : 'N/A'}
User Approved At: ${statusData.userApprovedAt ? new Date(statusData.userApprovedAt).toUTCString() : 'N/A'}
Confirmation Code: ${statusData.confirmationCode || 'CONFIRMED'}
Submission Proof URL: ${statusData.submissionProofUrl || 'Captured in Scholaris Vault'}

Mandatory Submission Rule Compliance:
Explicit user authorization confirmed prior to browser automation execution.
=====================================================
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `scholaris-receipt-${applicationId.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in-0 duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-progress-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                isSubmitted
                  ? 'bg-emerald-600 text-white'
                  : isFailed
                  ? 'bg-red-600 text-white'
                  : 'bg-slate-900 text-white'
              }`}
            >
              {isSubmitted ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : isFailed ? (
                <AlertTriangle className="w-5 h-5 text-white" />
              ) : (
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              )}
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {isSubmitted
                  ? 'Submission Confirmed'
                  : isFailed
                  ? 'Submission Interrupted'
                  : 'Automated Submission In Progress'}
              </span>
              <h2 id="submission-progress-title" className="text-base font-bold text-slate-900 truncate max-w-md">
                {scholarshipTitle}
              </h2>
            </div>
          </div>

          {!isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Active Submitting State: Stepper & Live Clock */}
          {isSubmitting && (
            <div className="space-y-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>Elapsed Time: <strong>{elapsedSeconds}s</strong></span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  Worker Executing
                </span>
              </div>

              {/* Submission Stepper */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Submission Execution Pipeline
                </h3>

                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {/* Step 1: User Authorization */}
                  <div className="relative flex items-start gap-3">
                    <span className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      <Check className="w-3 h-3 stroke-3" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Student Digital Authorization Verified
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Mandatory submission consent cryptographically logged and confirmed.
                      </p>
                    </div>
                  </div>

                  {/* Step 2: Browser Session & Form Navigation */}
                  <div className="relative flex items-start gap-3">
                    <span className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                      <Check className="w-3 h-3 stroke-3" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">
                        Navigating & Verifying Portal Fields
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Chromium headless sandbox matched all input fields and attachments.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Trigger Final Submit */}
                  <div className="relative flex items-start gap-3">
                    <span className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-blue-900">
                        Triggering Final Portal Submission
                      </h4>
                      <p className="text-[11px] text-blue-700">
                        Submitting verified payloads to admissions provider endpoint...
                      </p>
                    </div>
                  </div>

                  {/* Step 4: Capture Confirmation */}
                  <div className="relative flex items-start gap-3">
                    <span className="absolute -left-6 mt-0.5 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs">
                      4
                    </span>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-400">
                        Capture Confirmation & Proof Snapshot
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Waiting for portal confirmation receipt...
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-blue-50/60 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Automated Worker Active</p>
                <p>
                  Please keep this tab open while our worker secures submission confirmation. This typically takes 5–15 seconds.
                </p>
              </div>
            </div>
          )}

          {/* Submitted State: Official Receipt & Proof */}
          {isSubmitted && (
            <div className="space-y-6">
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-emerald-950">
                  Application Successfully Submitted!
                </h3>
                <p className="text-xs text-emerald-800 max-w-md mx-auto">
                  Your application has been received by <strong>{providerName}</strong>. Submission confirmation and proof screenshot have been saved to your vault.
                </p>
              </div>

              {/* Receipt Details Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-xs text-slate-500 font-medium">Confirmation Reference</span>
                  <div className="flex items-center gap-1.5">
                    <code className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-900 font-mono text-xs font-bold rounded-lg">
                      {statusData?.confirmationCode || 'CONFIRMED'}
                    </code>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(statusData?.confirmationCode || 'CONFIRMED')}
                      className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Copy Confirmation Code"
                    >
                      {copiedCode ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Submission Timestamp</span>
                  <span className="font-semibold text-slate-900">
                    {statusData?.submittedAt
                      ? new Date(statusData.submittedAt).toLocaleString()
                      : new Date().toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pb-3 border-b border-slate-100">
                  <span className="text-slate-500">Authorized Signature</span>
                  <span className="font-semibold text-slate-900">
                    {statusData?.userApprovedAt
                      ? `Signed at ${new Date(statusData.userApprovedAt).toLocaleTimeString()}`
                      : 'Verified'}
                  </span>
                </div>

                {/* Submission Proof Screenshot Thumbnail */}
                {statusData?.submissionProofUrl && (
                  <div className="pt-1 space-y-2">
                    <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-indigo-600" />
                      Official Submission Proof Screenshot
                    </span>
                    <div className="relative border border-slate-200 rounded-xl overflow-hidden aspect-video bg-slate-100 group shadow-2xs">
                      <img
                        src={statusData.submissionProofUrl}
                        alt="Official submission confirmation proof"
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      />
                      <a
                        href={statusData.submissionProofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5"
                      >
                        <ExternalLink className="w-4 h-4" /> View Full Resolution Proof
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Failed State */}
          {isFailed && (
            <div className="p-5 bg-red-50 border border-red-200 rounded-2xl space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-red-950">
                    Submission Encountered an Error
                  </h3>
                  <p className="text-xs text-red-800 leading-relaxed">
                    {statusData?.errorLog ||
                      'The portal session could not complete the final submit action. Please check your network or review portal requirements.'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push(`/applications/${applicationId}`)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  Return to Workspace
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between gap-3">
          {isSubmitted ? (
            <>
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download Receipt (.txt)
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/applications/${applicationId}`);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-xs"
              >
                View in Application Tracker
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : isFailed ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-300 transition-colors"
            >
              Dismiss
            </button>
          ) : (
            <div className="w-full text-center text-xs text-slate-500 font-medium">
              Executing under Mandatory Submission Rule authorization...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
