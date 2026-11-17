'use client';

import React, { useState } from 'react';
import { DocumentDTO } from '@scholaris/types';
import { api } from '../../lib/api';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  FileText,
  Download,
  Copy,
  Check,
  Calendar,
  HardDrive,
  ShieldCheck,
  FileCode,
  Clock,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface DocumentPreviewModalProps {
  document: DocumentDTO | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentPreviewModal({
  document,
  isOpen,
  onClose,
}: DocumentPreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  if (!document) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await api.getDownloadUrl(document.id);
      // Trigger browser download via anchor
      const link = window.document.createElement('a');
      link.href = res.downloadUrl;
      link.download = document.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } catch (err: any) {
      alert(err.message || 'Failed to generate download URL');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyText = async () => {
    if (!document.extractedText) return;
    try {
      await navigator.clipboard.writeText(document.extractedText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      alert('Unable to copy to clipboard.');
    }
  };

  const statusBadges = {
    PENDING: (
      <Badge variant="uncertain" size="sm" className="gap-1">
        <Clock className="w-3 h-3" />
        Extraction Pending
      </Badge>
    ),
    PROCESSING: (
      <Badge variant="uncertain" size="sm" className="gap-1">
        <Sparkles className="w-3 h-3 animate-spin" />
        Processing OCR
      </Badge>
    ),
    COMPLETED: (
      <Badge variant="verified" size="sm" className="gap-1">
        <ShieldCheck className="w-3 h-3" />
        Text Extracted
      </Badge>
    ),
    FAILED: (
      <Badge variant="suspicious" size="sm" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        Extraction Failed
      </Badge>
    ),
  };

  const formattedSize =
    document.sizeBytes < 1024 * 1024
      ? `${(document.sizeBytes / 1024).toFixed(1)} KB`
      : `${(document.sizeBytes / (1024 * 1024)).toFixed(2)} MB`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={document.name}
      description={`Category: ${document.category.replace('_', ' ')} &bull; Stored in private S3 bucket`}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Document Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              Category
            </span>
            <p className="font-semibold text-slate-800">{document.category}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              OCR Status
            </span>
            <div>{statusBadges[document.ocrStatus]}</div>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              File Size
            </span>
            <p className="font-mono font-semibold text-slate-800 tabular-nums">
              {formattedSize}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              MIME Type
            </span>
            <p className="font-mono text-slate-700 truncate">{document.mimeType}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              Uploaded On
            </span>
            <p className="font-mono text-slate-700 tabular-nums">
              {document.createdAt.slice(0, 10)}
            </p>
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-400 uppercase tracking-wider text-[10px] font-semibold">
              Checksum
            </span>
            <p className="font-mono text-slate-600 truncate">{document.checksum || 'N/A'}</p>
          </div>
        </div>

        {/* Extracted Text Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" />
              Extracted Text / OCR Data
            </h4>
            {document.extractedText && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyText}
                leftIcon={copiedText ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                className="text-xs py-1 h-7"
              >
                {copiedText ? 'Copied' : 'Copy Text'}
              </Button>
            )}
          </div>

          {document.extractedText ? (
            <div className="p-3.5 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap select-all">
              {document.extractedText}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center text-xs text-slate-500 space-y-1">
              <p className="font-medium text-slate-700">No extracted text available yet.</p>
              <p className="text-[11px] text-slate-400">
                Text and structural data will appear here once the background OCR worker processes this file.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>

          <Button
            size="sm"
            onClick={handleDownload}
            isLoading={isDownloading}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Download Original File
          </Button>
        </div>
      </div>
    </Modal>
  );
}
