'use client';

import React, { useState } from 'react';
import {
  FileText,
  Download,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Layers,
  FileCheck2,
} from 'lucide-react';
import { ReviewDocumentItem } from '@scholaris/types';
import { api } from '@/lib/api';

interface ReviewDocumentsListProps {
  documents: ReviewDocumentItem[];
}

export function ReviewDocumentsList({ documents }: ReviewDocumentsListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (doc: ReviewDocumentItem) => {
    try {
      setDownloadingId(doc.id);
      const res = await api.getDocumentDownloadUrl(doc.id);
      if (res.downloadUrl) {
        window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      alert(`Failed to download document: ${err.message || 'Unknown error'}`);
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getCategoryBadge = (category: string) => {
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
        {category.replace(/_/g, ' ')}
      </span>
    );
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">No Attached Documents</h4>
        <p className="text-xs text-slate-500 mt-1">
          This scholarship does not require file uploads, or documents have not yet been attached.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="p-4 bg-white border border-slate-200 hover:border-indigo-200 rounded-xl shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 text-indigo-600">
              <FileCheck2 className="w-5 h-5" />
            </div>

            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                {getCategoryBadge(doc.category)}
                <span className="text-xs text-slate-500 font-mono">
                  {formatFileSize(doc.sizeBytes)}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 truncate" title={doc.name}>
                {doc.name}
              </h4>
              {doc.targetFieldKey && (
                <p className="text-xs text-slate-500 truncate">
                  Attached to portal field: <strong>{doc.targetFieldKey}</strong>
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified in Vault
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(doc)}
                disabled={downloadingId === doc.id}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 hover:text-indigo-600 hover:bg-slate-100 rounded-md font-medium transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {downloadingId === doc.id ? 'Loading...' : 'Preview / Download'}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
