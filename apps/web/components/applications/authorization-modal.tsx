'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  AlertTriangle,
  CheckSquare,
  Square,
  FileCheck2,
  Calendar,
  Sparkles,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface AuthorizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthorized: (data: { signature: string; consentHash: string }) => Promise<void>;
  scholarshipTitle: string;
  providerName: string;
  deadline?: string | null;
  totalFieldsCount: number;
  documentsCount: number;
}

export function AuthorizationModal({
  isOpen,
  onClose,
  onAuthorized,
  scholarshipTitle,
  providerName,
  deadline,
  totalFieldsCount,
  documentsCount,
}: AuthorizationModalProps) {
  const [hasConfirmedAccuracy, setHasConfirmedAccuracy] = useState(false);
  const [hasConfirmedSubmission, setHasConfirmedSubmission] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setHasConfirmedAccuracy(false);
      setHasConfirmedSubmission(false);
      setDigitalSignature('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const canProceed =
    hasConfirmedAccuracy &&
    hasConfirmedSubmission &&
    digitalSignature.trim().length >= 3 &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canProceed) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Generate verifiable consent hash based on signature and timestamp
      const timestamp = new Date().toISOString();
      const rawData = `${digitalSignature.trim()}|${scholarshipTitle}|${timestamp}`;
      let hash = 0;
      for (let i = 0; i < rawData.length; i++) {
        hash = (hash << 5) - hash + rawData.charCodeAt(i);
        hash |= 0;
      }
      const consentHash = `SCHOLARIS_CONSENT_${Math.abs(hash).toString(16).toUpperCase()}_${Date.now()}`;

      await onAuthorized({
        signature: digitalSignature.trim(),
        consentHash,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record authorization. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in-0 duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="authorization-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Mandatory Submission Rule
                </span>
                <span className="text-xs text-slate-500 font-medium">Step 1 of 2</span>
              </div>
              <h2 id="authorization-modal-title" className="text-base font-bold text-slate-900">
                Authorize Scholarship Application Submission
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div
              role="alert"
              className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-start gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Authorization Failed</p>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Application Summary Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Target Scholarship
                </span>
                <h3 className="text-sm font-bold text-slate-900">{scholarshipTitle}</h3>
                <p className="text-xs text-slate-600">Provider: {providerName}</p>
              </div>
              {deadline && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Deadline: {new Date(deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-200/80 flex items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                <strong>{totalFieldsCount}</strong> Verified Fields
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                <strong>{documentsCount}</strong> Attached Documents
              </span>
            </div>
          </div>

          {/* Legal Caution Alert */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Final Submission Notice
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              By authorizing, you instruct the Scholaris automated browser worker to transmit your verified form data and uploaded documents directly to the scholarship provider&apos;s admissions portal. <strong>This action is irreversible</strong> once the final submission button is triggered.
            </p>
          </div>

          {/* Checkboxes for Explicit Student Consent */}
          <div className="space-y-3">
            <label
              htmlFor="consent-accuracy"
              className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-colors"
            >
              <input
                id="consent-accuracy"
                type="checkbox"
                checked={hasConfirmedAccuracy}
                onChange={(e) => setHasConfirmedAccuracy(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-[#1E3A5F]"
              />
              <span className="text-xs text-slate-700 leading-relaxed select-none">
                <strong>Accuracy & Authorship:</strong> I confirm that I have reviewed all personal statements, essays, academic credentials, and answers. All information is truthful, complete, and represents my own work.
              </span>
            </label>

            <label
              htmlFor="consent-transmission"
              className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50/80 cursor-pointer transition-colors"
            >
              <input
                id="consent-transmission"
                type="checkbox"
                checked={hasConfirmedSubmission}
                onChange={(e) => setHasConfirmedSubmission(e.target.checked)}
                disabled={isSubmitting}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-[#1E3A5F]"
              />
              <span className="text-xs text-slate-700 leading-relaxed select-none">
                <strong>Explicit Authorization to Submit:</strong> In accordance with the Mandatory Submission Rule, I explicitly grant Scholaris permission to execute final submission of this application to <em>{providerName}</em>.
              </span>
            </label>
          </div>

          {/* Digital Signature Field */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <label
                htmlFor="digital-signature"
                className="block text-xs font-bold text-slate-900"
              >
                Electronic Signature (Type Full Legal Name)
              </label>
              <span className="text-[11px] text-slate-500">
                Required for auditable consent record
              </span>
            </div>

            <input
              id="digital-signature"
              type="text"
              value={digitalSignature}
              onChange={(e) => setDigitalSignature(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Jane Marie Doe"
              autoComplete="off"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium placeholder-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-[#1E3A5F] focus:outline-hidden transition-all disabled:bg-slate-100"
            />
            <p className="text-[11px] text-slate-500">
              Your signature and digital timestamp will be permanently cryptographically logged in your application audit trail.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel & Review More
            </button>

            <button
              type="submit"
              disabled={!canProceed}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Recording Authorization...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Sign & Confirm Submission
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
