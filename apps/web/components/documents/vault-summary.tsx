'use client';

import React from 'react';
import { DocumentDTO, DocumentCategory } from '@scholaris/types';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import {
  FolderLock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Award,
  Sparkles,
} from 'lucide-react';

interface VaultSummaryProps {
  documents: DocumentDTO[];
}

export function VaultSummary({ documents }: VaultSummaryProps) {
  const hasTranscript = documents.some((d) => d.category === 'TRANSCRIPT');
  const hasCV = documents.some((d) => d.category === 'CV');
  const hasPassport = documents.some((d) => d.category === 'PASSPORT');
  const hasRecommendation = documents.some((d) => d.category === 'RECOMMENDATION');
  const hasCertificate = documents.some((d) => d.category === 'CERTIFICATE');

  // Compute vault completeness score
  let score = 0;
  if (hasTranscript) score += 35;
  if (hasCV) score += 25;
  if (hasPassport) score += 20;
  if (hasRecommendation) score += 10;
  if (hasCertificate) score += 10;

  const totalBytes = documents.reduce((acc, curr) => acc + curr.sizeBytes, 0);
  const formattedTotalSize =
    totalBytes < 1024 * 1024
      ? `${(totalBytes / 1024).toFixed(1)} KB`
      : `${(totalBytes / (1024 * 1024)).toFixed(2)} MB`;

  const checklistItems = [
    {
      title: 'Academic Transcript',
      subtitle: 'Required for GPA & degree-level matching',
      isCompleted: hasTranscript,
      isMandatory: true,
    },
    {
      title: 'Curriculum Vitae / Resume',
      subtitle: 'Required for professional experience matching',
      isCompleted: hasCV,
      isMandatory: true,
    },
    {
      title: 'Passport / Official ID',
      subtitle: 'Required for nationality & regional eligibility',
      isCompleted: hasPassport,
      isMandatory: true,
    },
    {
      title: 'Recommendation Letters',
      subtitle: 'Boosts application competitiveness',
      isCompleted: hasRecommendation,
      isMandatory: false,
    },
    {
      title: 'Certificates (IELTS/TOEFL/Honors)',
      subtitle: 'Validates language proficiency scores',
      isCompleted: hasCertificate,
      isMandatory: false,
    },
  ];

  return (
    <Card className="border-slate-200/90 shadow-xs mb-8 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Vault Overview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <FolderLock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold font-serif text-slate-900 tracking-tight">
                    Document Vault
                  </h2>
                  <Badge variant="verified" size="sm">
                    Private S3 Storage
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 font-mono tabular-nums">
                  {documents.length} {documents.length === 1 ? 'file' : 'files'} &bull; {formattedTotalSize} stored securely
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 max-w-xl leading-relaxed">
              Uploaded academic records are securely hashed, encrypted, and mapped directly into your scholarship applications with strict human verification.
            </p>
          </div>

          {/* Right: Readiness Score Gauge */}
          <div className="lg:w-80 bg-slate-50/80 border border-slate-200/70 p-4 rounded-xl space-y-2 shrink-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Vault Readiness
              </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {score}%
              </span>
            </div>

            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  score >= 80 ? 'bg-emerald-600' : score >= 50 ? 'bg-amber-500' : 'bg-slate-700'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 flex items-center justify-between pt-0.5">
              <span>{score >= 80 ? 'Ready for auto-fill mapping' : 'Upload mandatory files'}</span>
              <span className="font-mono font-semibold text-slate-700">
                {checklistItems.filter((i) => i.isCompleted).length}/{checklistItems.length} checked
              </span>
            </p>
          </div>
        </div>

        {/* Verification Checklist Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-6 mt-6 border-t border-slate-100">
          {checklistItems.map((item, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-lg border text-left space-y-1 transition-colors ${
                item.isCompleted
                  ? 'bg-emerald-50/60 border-emerald-200/80'
                  : 'bg-white border-slate-200/70'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 truncate">
                  {item.title}
                </span>
                {item.isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {item.isMandatory ? 'Required' : 'Optional'}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 leading-tight truncate">
                {item.subtitle}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
