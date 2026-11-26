'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText } from 'lucide-react';
import { DocumentCategory, DocumentDTO } from '@scholaris/types';
import { presignedUploadRequestSchema } from '@scholaris/validation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface UploadDocumentPanelProps {
  onUploaded: (doc: DocumentDTO) => void;
}

const CATEGORY_OPTIONS: { value: DocumentCategory; label: string }[] = [
  { value: 'TRANSCRIPT', label: 'Academic Transcript' },
  { value: 'CV', label: 'CV / Resume' },
  { value: 'PASSPORT', label: 'Passport / ID' },
  { value: 'RECOMMENDATION', label: 'Recommendation Letter' },
  { value: 'MOTIVATION_LETTER', label: 'Motivation Letter' },
  { value: 'CERTIFICATE', label: 'Certificate / Score Report' },
  { value: 'OTHER', label: 'Other Document' },
];

export function UploadDocumentPanel({ onUploaded }: UploadDocumentPanelProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('TRANSCRIPT');
  const [isUploading, setIsUploading] = useState(false);
  const [stage, setStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFilePick = (file: File | null) => {
    setError(null);
    setSuccess(null);
    setSelectedFile(file);
    if (file && !name.trim()) {
      setName(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      setError('Choose a PDF, DOCX, PNG, or JPEG file to upload.');
      return;
    }

    const parsed = presignedUploadRequestSchema.safeParse({
      filename: selectedFile.name,
      mimeType: selectedFile.type,
      sizeBytes: selectedFile.size,
      category,
    });

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ||
          'Unsupported file type or size (max 10MB: PDF, DOCX, PNG, JPEG).'
      );
      return;
    }

    try {
      setIsUploading(true);
      setStage('Requesting secure upload link...');
      const presigned = await api.getPresignedUpload(parsed.data);

      setStage('Uploading file to vault...');
      const putRes = await fetch(presigned.uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': selectedFile.type,
        },
        body: selectedFile,
      });

      if (!putRes.ok) {
        throw new Error(`Storage upload failed (${putRes.status}).`);
      }

      setStage('Confirming upload & queuing OCR...');
      const confirmed = await api.confirmUpload({
        fileKey: presigned.fileKey,
        name: name.trim() || selectedFile.name,
        category,
        mimeType: selectedFile.type,
        sizeBytes: selectedFile.size,
        checksum: '',
      });

      setSelectedFile(null);
      setName('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setSuccess(`"${confirmed.name}" uploaded and queued for text extraction.`);
      onUploaded(confirmed);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Unable to upload document right now.'
      );
    } finally {
      setIsUploading(false);
      setStage(null);
    }
  };

  return (
    <section
      aria-label="Upload document"
      className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-4"
    >
      <div>
        <h2 className="text-base font-semibold text-ink">Upload a document</h2>
        <p className="text-sm text-ink-muted">
          PDF, DOCX, PNG, or JPEG up to 10MB. Text is automatically extracted for AI matching and essay drafting.
        </p>
      </div>

      <form onSubmit={handleUpload} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <label
              htmlFor="document-file-input"
              className="block text-xs font-medium text-ink-muted mb-1"
            >
              File
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                id="document-file-input"
                type="file"
                accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                disabled={isUploading}
                onChange={(e) => handleFilePick(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-10 justify-start font-normal text-ink truncate"
              >
                <FileText className="w-4 h-4 mr-2 text-ink-muted shrink-0" />
                <span className="truncate">
                  {selectedFile ? selectedFile.name : 'Choose PDF, DOCX, or image...'}
                </span>
              </Button>
            </div>
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="document-name-input"
              className="block text-xs font-medium text-ink-muted mb-1"
            >
              Display name
            </label>
            <input
              id="document-name-input"
              type="text"
              maxLength={255}
              placeholder="e.g. Official Transcript 2025"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isUploading}
              className="w-full h-10 px-3 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
            />
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="document-category-select"
              className="block text-xs font-medium text-ink-muted mb-1"
            >
              Category
            </label>
            <select
              id="document-category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              disabled={isUploading}
              className="w-full h-10 px-3 bg-canvas border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-muted">
            {stage ?? 'Encrypted in your private vault; never shared without your explicit submission approval.'}
          </p>
          <Button type="submit" disabled={isUploading || !selectedFile} className="h-11 px-5">
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </Button>
        </div>
      </form>

      {error && (
        <Alert variant="error" title="Upload failed">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" title="Upload complete">
          {success}
        </Alert>
      )}
    </section>
  );
}
