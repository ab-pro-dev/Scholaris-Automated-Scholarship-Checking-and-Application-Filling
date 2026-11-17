'use client';

import React, { useState } from 'react';
import { DocumentDTO } from '@scholaris/types';
import { api } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  FileText,
  FileCode,
  FileSpreadsheet,
  Image,
  Download,
  Eye,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface DocumentCardProps {
  document: DocumentDTO;
  onPreview: (doc: DocumentDTO) => void;
  onDeleted: (docId: string) => void;
}

export function DocumentCard({ document, onPreview, onDeleted }: DocumentCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-600" />;
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (mimeType.includes('image')) {
      return <Image className="w-5 h-5 text-emerald-600" />;
    }
    return <FileText className="w-5 h-5 text-slate-600" />;
  };

  const categoryVariants: Record<string, 'navy' | 'verified' | 'neutral' | 'uncertain'> = {
    TRANSCRIPT: 'navy',
    PASSPORT: 'verified',
    CV: 'neutral',
    RECOMMENDATION: 'uncertain',
    MOTIVATION_LETTER: 'uncertain',
    CERTIFICATE: 'verified',
    OTHER: 'neutral',
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDownloading(true);
    try {
      const res = await api.getDownloadUrl(document.id);
      const link = window.document.createElement('a');
      link.href = res.downloadUrl;
      link.download = document.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'Failed to download document');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to permanently delete "${document.name}"?`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.deleteDocument(document.id);
      onDeleted(document.id);
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
      setIsDeleting(false);
    }
  };

  const formattedSize =
    document.sizeBytes < 1024 * 1024
      ? `${(document.sizeBytes / 1024).toFixed(1)} KB`
      : `${(document.sizeBytes / (1024 * 1024)).toFixed(2)} MB`;

  const statusIndicators = {
    PENDING: (
      <span className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
        <Clock className="w-3 h-3 text-amber-500" />
        OCR Pending
      </span>
    ),
    PROCESSING: (
      <span className="flex items-center gap-1 text-[11px] text-amber-700 font-medium">
        <Sparkles className="w-3 h-3 text-amber-500 animate-spin" />
        Extracting...
      </span>
    ),
    COMPLETED: (
      <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
        <ShieldCheck className="w-3 h-3 text-emerald-600" />
        Verified OCR
      </span>
    ),
    FAILED: (
      <span className="flex items-center gap-1 text-[11px] text-red-700 font-medium">
        <AlertTriangle className="w-3 h-3 text-red-500" />
        OCR Failed
      </span>
    ),
  };

  return (
    <div
      onClick={() => onPreview(document)}
      className="group p-4 bg-white border border-slate-200/90 rounded-xl hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between space-y-3"
    >
      <div className="space-y-2.5">
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <Badge
            variant={categoryVariants[document.category] || 'neutral'}
            size="sm"
          >
            {document.category.replace('_', ' ')}
          </Badge>

          {statusIndicators[document.ocrStatus]}
        </div>

        {/* File Name & Icon */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200/70 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            {getFileIcon(document.mimeType)}
          </div>
          <div className="overflow-hidden space-y-0.5">
            <h4 className="text-sm font-semibold text-slate-900 truncate leading-snug" title={document.name}>
              {document.name}
            </h4>
            <p className="text-[11px] text-slate-500 font-mono tabular-nums">
              {formattedSize} &bull; {document.createdAt.slice(0, 10)}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(document);
          }}
          leftIcon={<Eye className="w-3.5 h-3.5" />}
          className="text-xs py-1 h-7 text-slate-600 hover:text-slate-900"
        >
          View
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            isLoading={isDownloading}
            leftIcon={<Download className="w-3.5 h-3.5" />}
            className="text-xs py-1 h-7"
          >
            Download
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            isLoading={isDeleting}
            className="p-1 h-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
            title="Delete Document"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
