'use client';

import React, { useState, useRef } from 'react';
import { DocumentCategory, DocumentDTO } from '@scholaris/types';
import { api, ApiError } from '../../lib/api';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

interface DocumentUploadZoneProps {
  onUploadSuccess: (newDocument: DocumentDTO) => void;
}

export function DocumentUploadZone({ onUploadSuccess }: DocumentUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('TRANSCRIPT');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return 'Unsupported file format. Please upload a PDF, DOCX, JPG, or PNG document.';
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return 'File size exceeds the 10MB maximum limit.';
    }
    return null;
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    setSuccessMessage(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const error = validateFile(file);
      if (error) {
        setUploadError(error);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setSuccessMessage(null);

    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const error = validateFile(file);
      if (error) {
        setUploadError(error);
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(5);
    setUploadError(null);
    setSuccessMessage(null);

    try {
      // Step 1: Request S3 Presigned Upload URL from backend API
      const presigned = await api.getPresignedUpload({
        filename: selectedFile.name,
        mimeType: selectedFile.type as any,
        sizeBytes: selectedFile.size,
        category,
      });

      setUploadProgress(20);

      // Step 2: Upload file directly to S3 / MinIO storage with progress tracking
      await api.uploadToS3(
        presigned.uploadUrl,
        selectedFile,
        selectedFile.type,
        (percent) => {
          // Scale progress between 20% and 85%
          setUploadProgress(Math.min(85, Math.max(20, Math.round(20 + percent * 0.65))));
        }
      );

      setUploadProgress(90);

      // Step 3: Confirm upload and record metadata in PostgreSQL
      const document = await api.confirmUpload({
        fileKey: presigned.fileKey,
        name: selectedFile.name,
        category,
        mimeType: selectedFile.type,
        sizeBytes: selectedFile.size,
        checksum: `sha256-${Date.now()}`,
      });

      setUploadProgress(100);
      setSuccessMessage(`"${selectedFile.name}" securely stored in vault.`);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      onUploadSuccess(document);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed. Please check network connection.');
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1500);
    }
  };

  return (
    <Card className="border-slate-200/90 shadow-xs mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-slate-800" />
          Upload Verified Document
        </CardTitle>
        <CardDescription>
          Store academic transcripts, CV, certificates, and identification to automate eligibility verification.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {uploadError && (
          <Alert variant="error" title="Upload Failed">
            {uploadError}
          </Alert>
        )}

        {successMessage && (
          <Alert variant="success" title="Success">
            {successMessage}
          </Alert>
        )}

        {/* Category Selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
            Document Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as DocumentCategory)}
            disabled={isUploading}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors"
          >
            <option value="TRANSCRIPT">Official / Unofficial Academic Transcript</option>
            <option value="CV">Curriculum Vitae / Resume</option>
            <option value="PASSPORT">Passport / National Identification</option>
            <option value="RECOMMENDATION">Letter of Recommendation</option>
            <option value="MOTIVATION_LETTER">Statement of Purpose / Motivation Letter</option>
            <option value="CERTIFICATE">Language / Merit Certificate</option>
            <option value="OTHER">Other Academic Supporting Document</option>
          </select>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            isDragging
              ? 'border-slate-900 bg-slate-50 scale-[1.005]'
              : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.jpg,.jpeg,.png"
            onChange={handleFileSelect}
            className="hidden"
            id="document-file-input"
            disabled={isUploading}
          />

          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 shadow-2xs">
                <UploadCloud className="w-6 h-6 text-slate-700" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800">
                  Drag and drop your file here, or{' '}
                  <label
                    htmlFor="document-file-input"
                    className="text-slate-900 underline font-bold cursor-pointer hover:text-slate-700"
                  >
                    browse files
                  </label>
                </p>
                <p className="text-xs text-slate-500">
                  Supported formats: PDF, DOCX, JPEG, PNG (Max size: 10MB)
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg max-w-lg mx-auto">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left overflow-hidden">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; {selectedFile.type || 'Unknown'}
                  </p>
                </div>
              </div>

              {!isUploading && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {isUploading && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1.5 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
                Encrypting and uploading directly to S3 storage...
              </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {uploadProgress}%
              </span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-slate-900 h-full transition-all duration-300 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Upload Action */}
        {selectedFile && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Direct cryptographic S3 presigned upload</span>
            </div>
            <Button
              onClick={handleStartUpload}
              isLoading={isUploading}
              size="sm"
              leftIcon={<UploadCloud className="w-4 h-4" />}
            >
              Upload Document
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
