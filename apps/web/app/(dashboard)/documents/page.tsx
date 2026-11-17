'use client';

import React, { useEffect, useState } from 'react';
import { DocumentCategory, DocumentDTO } from '@scholaris/types';
import { api } from '../../../lib/api';
import { VaultSummary } from '../../../components/documents/vault-summary';
import { DocumentUploadZone } from '../../../components/documents/document-upload-zone';
import { DocumentCard } from '../../../components/documents/document-card';
import { DocumentPreviewModal } from '../../../components/documents/document-preview-modal';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Alert } from '../../../components/ui/alert';
import {
  FolderArchive,
  Search,
  Filter,
  FileQuestion,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../../../components/ui/button';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewDocument, setPreviewDocument] = useState<DocumentDTO | null>(null);

  const loadDocuments = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listDocuments();
      setDocuments(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve uploaded documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleUploadSuccess = (newDoc: DocumentDTO) => {
    setDocuments((prev) => [newDoc, ...prev]);
  };

  const handleDocumentDeleted = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    if (previewDocument && previewDocument.id === docId) {
      setPreviewDocument(null);
    }
  };

  // Filter documents based on active category and search text
  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory =
      activeCategory === 'ALL' || doc.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categories = [
    { key: 'ALL', label: 'All Documents', count: documents.length },
    {
      key: 'TRANSCRIPT',
      label: 'Transcripts',
      count: documents.filter((d) => d.category === 'TRANSCRIPT').length,
    },
    {
      key: 'CV',
      label: 'CV & Resumes',
      count: documents.filter((d) => d.category === 'CV').length,
    },
    {
      key: 'PASSPORT',
      label: 'Passport & ID',
      count: documents.filter((d) => d.category === 'PASSPORT').length,
    },
    {
      key: 'RECOMMENDATION',
      label: 'Recommendations',
      count: documents.filter((d) => d.category === 'RECOMMENDATION').length,
    },
    {
      key: 'CERTIFICATE',
      label: 'Certificates',
      count: documents.filter((d) => d.category === 'CERTIFICATE').length,
    },
    {
      key: 'OTHER',
      label: 'Others',
      count: documents.filter((d) => d.category === 'OTHER' || d.category === 'MOTIVATION_LETTER').length,
    },
  ];

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="error" title="Synchronization Error">
          {error}
        </Alert>
      )}

      {/* Top Vault Readiness and Checklist Overview */}
      <VaultSummary documents={documents} />

      {/* Upload Zone */}
      <DocumentUploadZone onUploadSuccess={handleUploadSuccess} />

      {/* Vault Inventory Card */}
      <Card className="border-slate-200/90 shadow-xs">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-slate-800" />
            <CardTitle>Vault Records</CardTitle>
            <span className="text-xs font-mono text-slate-400 font-semibold tabular-nums ml-1">
              ({filteredDocuments.length} / {documents.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-64">
              <Input
                placeholder="Search documents by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-slate-400" />}
                className="h-9 text-xs"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadDocuments}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
              className="h-9 px-2.5"
              title="Refresh Documents"
            >
              Refresh
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-100">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                      : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                  }`}
                >
                  <span>{cat.label}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full tabular-nums ${
                      isActive ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cat.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Documents Grid */}
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Loading documents from encrypted vault...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
                <FileQuestion className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800">No Documents Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || activeCategory !== 'ALL'
                  ? 'No documents match your active filter or search query.'
                  : 'Your document vault is empty. Upload your official transcripts or CV above to begin.'}
              </p>
              {(searchQuery || activeCategory !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveCategory('ALL');
                    setSearchQuery('');
                  }}
                >
                  Reset Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onPreview={(d) => setPreviewDocument(d)}
                  onDeleted={handleDocumentDeleted}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Document Details & OCR Preview Modal */}
      <DocumentPreviewModal
        document={previewDocument}
        isOpen={!!previewDocument}
        onClose={() => setPreviewDocument(null)}
      />
    </div>
  );
}
