'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  LogIn,
  RefreshCw,
  Download,
  Trash2,
  RotateCw,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { DocumentCategory, DocumentDTO } from '@scholaris/types';
import { api } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';
import { OcrStatusBadge } from '@/components/documents/ocr-status-badge';
import { UploadDocumentPanel } from '@/components/documents/upload-document-panel';

type CategoryFilter = 'ALL' | DocumentCategory;

const CATEGORY_TABS: { key: CategoryFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'TRANSCRIPT', label: 'Transcripts' },
  { key: 'CV', label: 'CVs' },
  { key: 'PASSPORT', label: 'Passports' },
  { key: 'RECOMMENDATION', label: 'Recommendations' },
  { key: 'MOTIVATION_LETTER', label: 'Letters' },
  { key: 'CERTIFICATE', label: 'Certificates' },
  { key: 'OTHER', label: 'Other' },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function DocumentsSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-pebble rounded-lg animate-pulse" />
        <div className="h-4 w-96 max-w-full bg-pebble rounded-lg animate-pulse" />
      </div>
      <div className="h-44 bg-surface border border-line rounded-2xl p-5 space-y-3">
        <div className="h-5 w-40 bg-pebble rounded animate-pulse" />
        <div className="h-10 w-full bg-pebble rounded-xl animate-pulse" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-surface border border-line rounded-2xl p-5" />
        ))}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [isFetching, setIsFetching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      setIsFetching(true);
      setErrorMessage(null);
      const list = await api.listDocuments(
        categoryFilter === 'ALL' ? undefined : categoryFilter
      );
      setDocuments(list);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load your documents.'
      );
    } finally {
      setIsFetching(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadDocuments();
    }
  }, [authLoading, isAuthenticated, loadDocuments]);

  const handleDownload = async (doc: DocumentDTO) => {
    try {
      setBusyId(doc.id);
      setErrorMessage(null);
      const res = await api.getDocumentDownloadUrl(doc.id);
      window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to generate download link.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleReprocess = async (doc: DocumentDTO) => {
    try {
      setBusyId(doc.id);
      setErrorMessage(null);
      const updated = await api.reprocessDocument(doc.id);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to reprocess document.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (doc: DocumentDTO) => {
    try {
      setBusyId(doc.id);
      setErrorMessage(null);
      await api.deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to delete document.'
      );
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || (isAuthenticated && isFetching && documents.length === 0 && !errorMessage)) {
    return <DocumentsSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-surface border border-line rounded-2xl p-8 shadow-card text-center space-y-4">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Sign in to access your document vault
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Store transcripts, CVs, test score reports, and recommendation letters securely with automatic OCR extraction.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-action hover:bg-action-hover text-white text-sm font-medium transition-colors"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-line bg-surface hover:bg-pebble text-ink text-sm font-medium transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Document Vault
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Upload supporting files once, monitor OCR text extraction, and attach them to scholarship applications.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadDocuments}
          disabled={isFetching}
          className="h-11 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <UploadDocumentPanel
        onUploaded={(doc) => {
          if (categoryFilter === 'ALL' || categoryFilter === doc.category) {
            setDocuments((prev) => [doc, ...prev]);
          } else {
            setCategoryFilter('ALL');
          }
        }}
      />

      {/* Category Filter Bar */}
      <div
        className="bg-surface border border-line rounded-2xl p-2 shadow-card flex flex-wrap gap-1"
        role="tablist"
        aria-label="Document category filter"
      >
        {CATEGORY_TABS.map((tab) => {
          const active = categoryFilter === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategoryFilter(tab.key)}
              className={`h-9 px-3.5 rounded-xl text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                active
                  ? 'bg-action-soft text-action'
                  : 'text-ink-muted hover:text-ink hover:bg-pebble'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <Alert variant="error" title="Document action error">
          {errorMessage}
        </Alert>
      )}

      {documents.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-10 text-center space-y-2 shadow-card">
          <h2 className="text-base font-semibold text-ink">
            No documents in this category yet
          </h2>
          <p className="text-sm text-ink-muted max-w-md mx-auto">
            Use the upload form above to store your transcripts, CV, or certificates.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {documents.map((doc) => {
            const isExpanded = expandedId === doc.id;
            const isBusy = busyId === doc.id;
            return (
              <li
                key={doc.id}
                className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-pebble flex items-center justify-center text-ink-muted shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-ink truncate">
                          {doc.name}
                        </h3>
                        <Badge variant="neutral">
                          {doc.category.replace(/_/g, ' ')}
                        </Badge>
                        <OcrStatusBadge status={doc.ocrStatus} />
                      </div>
                      <p className="text-xs text-ink-muted tabular-nums">
                        {formatBytes(doc.sizeBytes)} · Uploaded {formatDate(doc.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {doc.extractedText && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : doc.id)
                        }
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3.5 h-3.5 mr-1" />
                            Hide Text
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 mr-1" />
                            Extracted Text
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleReprocess(doc)}
                    >
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" />
                      Re-run OCR
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => handleDelete(doc)}
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-danger-text" />
                    </Button>
                  </div>
                </div>

                {isExpanded && doc.extractedText && (
                  <div className="bg-canvas border border-line rounded-xl p-4">
                    <p className="text-xs font-medium text-ink-muted mb-2">
                      Extracted OCR text
                    </p>
                    <pre className="text-xs font-mono text-ink whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {doc.extractedText}
                    </pre>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
