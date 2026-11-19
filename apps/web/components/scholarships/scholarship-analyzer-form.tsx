'use client';

import React, { useState } from 'react';
import { Search, Globe, ChevronDown, ChevronUp, Loader2, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert } from '../ui/alert';

export interface ScholarshipAnalyzerFormProps {
  onAnalyze: (data: { url: string; title?: string; providerName?: string }) => Promise<void>;
  isLoading: boolean;
}

const PRESET_EXAMPLES = [
  {
    name: 'Oxford Clarendon Fund',
    url: 'https://www.ox.ac.uk/admissions/graduate/fees-and-funding/fees-funding-and-scholarship-search/clarendon-fund',
    provider: 'University of Oxford',
  },
  {
    name: 'DAAD Scholarships Germany',
    url: 'https://www.daad.de/en/study-and-research-in-germany/scholarships/',
    provider: 'DAAD',
  },
  {
    name: 'Chevening UK Government',
    url: 'https://www.chevening.org/scholarships/',
    provider: 'Foreign, Commonwealth & Development Office (UK)',
  },
];

export function ScholarshipAnalyzerForm({
  onAnalyze,
  isLoading,
}: ScholarshipAnalyzerFormProps) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [providerName, setProviderName] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setValidationError('Please enter a scholarship URL to analyze.');
      return;
    }

    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setValidationError('Only HTTP and HTTPS web addresses are permitted.');
        return;
      }

      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.localhost') ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname.startsWith('127.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname === '169.254.169.254'
      ) {
        setValidationError(
          'Security Warning: Private, loopback, and local network addresses are rejected by SSRF protection.'
        );
        return;
      }
    } catch {
      setValidationError('Please enter a valid, well-formed URL (e.g. https://ox.ac.uk/scholarship).');
      return;
    }

    await onAnalyze({
      url: trimmedUrl,
      title: title.trim() || undefined,
      providerName: providerName.trim() || undefined,
    });
  };

  const handleSelectPreset = (preset: (typeof PRESET_EXAMPLES)[0]) => {
    setUrl(preset.url);
    setTitle(preset.name);
    setProviderName(preset.provider);
    setValidationError(null);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 sm:p-6 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
            <Globe className="w-5 h-5 text-slate-700" />
            Scholarship URL Ingestion & Safety Screening
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Submit any scholarship webpage. Scholaris will verify its academic legitimacy and screen for scam indicators.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main URL Ingestion Bar */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="Paste official scholarship URL (e.g. https://ox.ac.uk/scholarships/clarendon)..."
              disabled={isLoading}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 focus:bg-white transition-all"
            />
          </div>

          <Button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="sm:w-auto w-full px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-xs flex items-center justify-center gap-2 shrink-0 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Screening URL...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Analyze & Verify</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-70" />
              </>
            )}
          </Button>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <Alert variant="error" title="URL Validation Error" className="text-xs">
            {validationError}
          </Alert>
        )}

        {/* Presets Row */}
        <div className="pt-1 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Quick examples:</span>
          {PRESET_EXAMPLES.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => handleSelectPreset(preset)}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 hover:bg-slate-200/80 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200/60 transition-colors cursor-pointer"
            >
              <span>{preset.name}</span>
            </button>
          ))}
        </div>

        {/* Advanced Optional Overrides */}
        <div className="pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors cursor-pointer"
          >
            <span>Advanced metadata overrides</span>
            {showAdvanced ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
              <Input
                label="Custom Scholarship Title (Optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Clarendon Fund Graduate Award"
                disabled={isLoading}
                helperText="Overrides title detected from page HTML"
              />
              <Input
                label="Custom Provider Name (Optional)"
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g. University of Oxford"
                disabled={isLoading}
                helperText="Overrides provider detected from domain"
              />
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
