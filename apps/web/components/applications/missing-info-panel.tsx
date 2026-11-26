'use client';

import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Clock, Save } from 'lucide-react';
import {
  EssayDraftResult,
  MissingInfoDetailDTO,
} from '@scholaris/types';
import { draftEssaySchema } from '@scholaris/validation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

interface MissingInfoPanelProps {
  applicationId: string;
  items: MissingInfoDetailDTO[];
  onUpdated: () => void;
}

type ToneOption = 'ACADEMIC' | 'MOTIVATIONAL' | 'PROFESSIONAL' | 'PERSONAL';

export function MissingInfoPanel({
  applicationId,
  items,
  onUpdated,
}: MissingInfoPanelProps) {
  const [responses, setResponses] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const item of items) {
      initial[item.id] = item.userResponse ?? '';
    }
    return initial;
  });
  const [tones, setTones] = useState<Record<string, ToneOption>>({});
  const [draftInsights, setDraftInsights] = useState<Record<string, EssayDraftResult>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (item: MissingInfoDetailDTO) => {
    const value = (responses[item.id] ?? '').trim();
    if (!value) {
      setError('Enter or select a response before saving.');
      return;
    }

    try {
      setSavingId(item.id);
      setError(null);
      await api.updateMissingInfo(applicationId, item.id, value);
      onUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save response.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDraftEssay = async (item: MissingInfoDetailDTO) => {
    const parsed = draftEssaySchema.safeParse({
      prompt: item.prompt,
      fieldId: item.fieldId ?? undefined,
      targetTone: tones[item.id] ?? 'ACADEMIC',
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Essay prompt is too short.');
      return;
    }

    try {
      setDraftingId(item.id);
      setError(null);
      const draft = await api.draftEssay(applicationId, parsed.data);
      setResponses((prev) => ({ ...prev, [item.id]: draft.essayDraft }));
      setDraftInsights((prev) => ({ ...prev, [item.id]: draft }));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI essay drafting failed.');
    } finally {
      setDraftingId(null);
    }
  };

  if (items.length === 0) {
    return (
      <section className="bg-surface border border-line rounded-2xl p-6 shadow-card text-center space-y-2">
        <CheckCircle2 className="w-6 h-6 text-verified-text mx-auto" />
        <h2 className="text-base font-semibold text-ink">
          All missing items resolved
        </h2>
        <p className="text-sm text-ink-muted max-w-md mx-auto">
          There are no unresolved prompts, document attachments, or essay questions blocking your final review.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {error && (
        <Alert variant="error" title="Could not complete action">
          {error}
        </Alert>
      )}

      {items.map((item) => {
        const value = responses[item.id] ?? item.userResponse ?? '';
        const insight = draftInsights[item.id];
        const isSaving = savingId === item.id;
        const isDrafting = draftingId === item.id;

        return (
          <div
            key={item.id}
            className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={item.isResolved ? 'verified' : 'warning'}>
                    {item.isResolved ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Needs Input
                      </span>
                    )}
                  </Badge>
                  <Badge variant="neutral">
                    {item.category.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <h3 className="text-sm font-semibold text-ink leading-snug pt-1">
                  {item.prompt}
                </h3>
                {item.field?.label && (
                  <p className="text-xs text-ink-muted">
                    Target field: {item.field.label}
                  </p>
                )}
              </div>
            </div>

            {item.category === 'DOCUMENT_UPLOAD' && item.availableDocuments ? (
              <div className="space-y-2">
                <label
                  htmlFor={`doc-select-${item.id}`}
                  className="block text-xs font-medium text-ink-muted"
                >
                  Select a document from your vault
                </label>
                <select
                  id={`doc-select-${item.id}`}
                  value={value}
                  onChange={(e) =>
                    setResponses((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  className="w-full h-10 px-3 bg-canvas border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-action"
                >
                  <option value="">Choose uploaded document...</option>
                  {item.availableDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.category.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                {item.category === 'ESSAY_RESPONSE' && (
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-canvas border border-line rounded-xl p-3">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`tone-${item.id}`}
                        className="text-xs font-medium text-ink-muted"
                      >
                        AI draft tone:
                      </label>
                      <select
                        id={`tone-${item.id}`}
                        value={tones[item.id] ?? 'ACADEMIC'}
                        onChange={(e) =>
                          setTones((prev) => ({
                            ...prev,
                            [item.id]: e.target.value as ToneOption,
                          }))
                        }
                        className="h-8 px-2.5 bg-surface border border-line rounded-lg text-xs text-ink focus:outline-none focus:ring-2 focus:ring-action"
                      >
                        <option value="ACADEMIC">Academic</option>
                        <option value="MOTIVATIONAL">Motivational</option>
                        <option value="PROFESSIONAL">Professional</option>
                        <option value="PERSONAL">Personal</option>
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={isDrafting || isSaving}
                      onClick={() => handleDraftEssay(item)}
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      {isDrafting ? 'Drafting...' : 'Draft with AI'}
                    </Button>
                  </div>
                )}

                <textarea
                  rows={item.category === 'ESSAY_RESPONSE' ? 6 : 3}
                  value={value}
                  onChange={(e) =>
                    setResponses((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  placeholder={
                    item.category === 'ESSAY_RESPONSE'
                      ? 'Write your response or generate an AI draft to edit...'
                      : 'Enter your answer...'
                  }
                  className="w-full p-3 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action"
                />

                {insight && (
                  <div className="bg-canvas border border-line rounded-xl p-3.5 text-xs space-y-2">
                    <div className="flex items-center justify-between text-ink-muted">
                      <span className="font-medium text-ink">
                        AI draft generated — please review and personalize before saving
                      </span>
                      <span className="tabular-nums">{insight.wordCount} words</span>
                    </div>
                    {insight.suggestedEdits.length > 0 && (
                      <ul className="list-disc list-inside text-ink-muted space-y-0.5">
                        {insight.suggestedEdits.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                disabled={isSaving || isDrafting}
                onClick={() => handleSave(item)}
                className="h-10 px-4"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {isSaving ? 'Saving...' : 'Save Response'}
              </Button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
