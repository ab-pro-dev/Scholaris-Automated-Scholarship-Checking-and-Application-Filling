'use client';

import React, { useState } from 'react';
import { Sparkles, Check, Pencil, X } from 'lucide-react';
import {
  ApplicationFieldDTO,
  FieldMappingDTO,
  MappingSourceType,
} from '@scholaris/types';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

interface FieldMappingsPanelProps {
  applicationId: string;
  fields: ApplicationFieldDTO[];
  mappings: Array<FieldMappingDTO & { field?: ApplicationFieldDTO }>;
  onMatched: () => void;
  onMappingUpdated: (updated: FieldMappingDTO) => void;
}

const SOURCE_LABELS: Record<MappingSourceType, string> = {
  PROFILE: 'Profile',
  DOCUMENT: 'Document',
  USER_INPUT: 'Manual Entry',
  AI_DRAFT: 'AI Draft',
};

export function FieldMappingsPanel({
  applicationId,
  fields,
  mappings,
  onMatched,
  onMappingUpdated,
}: FieldMappingsPanelProps) {
  const [isMatching, setIsMatching] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [savingFieldId, setSavingFieldId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mappingByField = new Map(mappings.map((m) => [m.fieldId, m]));

  const handleRunMatch = async () => {
    try {
      setIsMatching(true);
      setError(null);
      setNotice(null);
      const summary = await api.matchFields(applicationId);
      setNotice(
        `Matched ${summary.matchedFieldsCount} of ${summary.totalFieldsCount} fields (${summary.missingFieldsCount} need your input).`
      );
      onMatched();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to run auto-match.');
    } finally {
      setIsMatching(false);
    }
  };

  const startEdit = (fieldId: string, currentValue: string) => {
    setEditingFieldId(fieldId);
    setDraftValue(currentValue);
    setError(null);
  };

  const saveEdit = async (fieldId: string) => {
    try {
      setSavingFieldId(fieldId);
      setError(null);
      const updated = await api.updateFieldMapping(applicationId, {
        fieldId,
        mappedValue: draftValue,
      });
      onMappingUpdated(updated);
      setEditingFieldId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update field.');
    } finally {
      setSavingFieldId(null);
    }
  };

  return (
    <section className="bg-surface border border-line rounded-2xl p-6 shadow-card space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Mapped application fields
          </h2>
          <p className="text-sm text-ink-muted">
            Inspect auto-filled values from your profile and documents, or override any field manually.
          </p>
        </div>
        <Button
          onClick={handleRunMatch}
          disabled={isMatching}
          className="h-10 shrink-0"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {isMatching ? 'Matching...' : 'Run Auto-Match'}
        </Button>
      </div>

      {error && (
        <Alert variant="error" title="Field matching error">
          {error}
        </Alert>
      )}
      {notice && (
        <Alert variant="success" title="Auto-match complete">
          {notice}
        </Alert>
      )}

      {fields.length === 0 ? (
        <div className="bg-canvas border border-line rounded-xl p-6 text-center space-y-2">
          <p className="text-sm font-medium text-ink">
            No form fields discovered yet
          </p>
          <p className="text-xs text-ink-muted max-w-md mx-auto">
            Click &ldquo;Run Auto-Match&rdquo; once the scholarship portal fields are scanned, or resolve any prompts in the Missing Information tab.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {fields.map((field) => {
            const mapping = mappingByField.get(field.id);
            const isEditing = editingFieldId === field.id;
            const isSaving = savingFieldId === field.id;

            return (
              <li
                key={field.id}
                className="border border-line rounded-xl p-4 space-y-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-ink">
                        {field.label}
                      </span>
                      {field.isRequired && (
                        <Badge variant="warning">Required</Badge>
                      )}
                      <Badge variant="neutral">Page {field.pageNumber}</Badge>
                    </div>
                    <p className="text-xs font-mono text-ink-muted">
                      {field.fieldKey} · {field.fieldType}
                    </p>
                  </div>

                  {mapping && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          mapping.confidence >= 0.8
                            ? 'verified'
                            : mapping.confidence >= 0.5
                              ? 'warning'
                              : 'neutral'
                        }
                        className="tabular-nums"
                      >
                        {SOURCE_LABELS[mapping.sourceType]} ·{' '}
                        {Math.round(mapping.confidence * 100)}%
                      </Badge>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={field.fieldType === 'TEXTAREA' ? 4 : 2}
                      value={draftValue}
                      onChange={(e) => setDraftValue(e.target.value)}
                      className="w-full p-3 bg-canvas border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-action"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => setEditingFieldId(null)}
                      >
                        <X className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSaving}
                        onClick={() => saveEdit(field.id)}
                      >
                        <Check className="w-3.5 h-3.5 mr-1" />
                        {isSaving ? 'Saving...' : 'Save Value'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3 bg-canvas border border-line rounded-xl px-3.5 py-2.5">
                    <p className="text-sm text-ink whitespace-pre-wrap break-words">
                      {mapping?.mappedValue ? (
                        mapping.mappedValue
                      ) : (
                        <span className="text-ink-muted italic">
                          Not mapped yet
                        </span>
                      )}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(field.id, mapping?.mappedValue ?? '')}
                      aria-label={`Edit ${field.label}`}
                      className="shrink-0"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
