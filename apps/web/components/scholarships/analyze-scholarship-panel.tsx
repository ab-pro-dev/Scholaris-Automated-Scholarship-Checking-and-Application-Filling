'use client';

import React, { useState } from 'react';
import { Globe, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { analyzeScholarshipSchema } from '@scholaris/validation';
import { api, ScholarshipDetailDTO } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface AnalyzeScholarshipPanelProps {
  onIngested: (scholarship: ScholarshipDetailDTO, isExisting: boolean) => void;
}

export function AnalyzeScholarshipPanel({ onIngested }: AnalyzeScholarshipPanelProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [providerName, setProviderName] = useState('');
  const [showOptional, setShowOptional] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const parsed = analyzeScholarshipSchema.safeParse({
      url: url.trim(),
      title: title.trim() || undefined,
      providerName: providerName.trim() || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Enter a valid HTTP or HTTPS scholarship URL.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.analyzeScholarship(parsed.data);
      setUrl('');
      setTitle('');
      setProviderName('');
      setNotice(
        res.isExisting
          ? `Found existing record for "${res.scholarship.title}".`
          : `Added "${res.scholarship.title}". Open details to run authenticity verification and eligibility checks.`
      );
      onIngested(res.scholarship, res.isExisting);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to inspect that URL. Ensure it points to a public scholarship page.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      aria-label="Add scholarship URL"
      className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Verify a scholarship link
          </h2>
          <p className="text-sm text-ink-muted">
            Paste an official scholarship URL to fetch metadata safely, check authenticity, and match requirements against your profile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowOptional((prev) => !prev)}
          className="inline-flex items-center gap-1 text-xs font-medium text-action hover:text-action-hover self-start sm:self-center shrink-0 min-h-[36px] px-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          {showOptional ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Hide custom fields
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Add title or provider
            </>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Globe className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <label htmlFor="scholarship-url-input" className="sr-only">
              Scholarship website URL
            </label>
            <input
              id="scholarship-url-input"
              type="url"
              required
              placeholder="https://foundation.org/scholarships/fellowship-2026"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isSubmitting}
              className="w-full h-11 pl-10 pr-4 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action transition-colors"
            />
          </div>
          <Button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="h-11 px-5 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Analyzing URL...' : 'Analyze Link'}
          </Button>
        </div>

        {showOptional && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label
                htmlFor="scholarship-title-input"
                className="block text-xs font-medium text-ink-muted mb-1"
              >
                Scholarship title (optional)
              </label>
              <input
                id="scholarship-title-input"
                type="text"
                maxLength={255}
                placeholder="e.g. Chevening Global Fellowship"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 px-3 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
              />
            </div>
            <div>
              <label
                htmlFor="scholarship-provider-input"
                className="block text-xs font-medium text-ink-muted mb-1"
              >
                Provider / organization (optional)
              </label>
              <input
                id="scholarship-provider-input"
                type="text"
                maxLength={255}
                placeholder="e.g. UK Foreign, Commonwealth & Development Office"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 px-3 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
              />
            </div>
          </div>
        )}
      </form>

      {error && (
        <Alert variant="error" title="Could not analyze link">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert variant="success" title="Scholarship ready">
          {notice}
        </Alert>
      )}
    </section>
  );
}
