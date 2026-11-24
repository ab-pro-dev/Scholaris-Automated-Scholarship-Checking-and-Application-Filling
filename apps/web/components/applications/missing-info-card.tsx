'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Save,
  RefreshCw,
  Info,
} from 'lucide-react';
import { MissingInfoDetailDTO, EssayDraftResult } from '@scholaris/types';
import { api } from '@/lib/api';

interface MissingInfoCardProps {
  applicationId: string;
  missingItems: MissingInfoDetailDTO[];
  onResolved: () => void;
}

export function MissingInfoCard({
  applicationId,
  missingItems,
  onResolved,
}: MissingInfoCardProps) {
  const [activeItem, setActiveItem] = useState<string | null>(
    missingItems.find((m) => !m.isResolved)?.id || null
  );
  const [textResponses, setTextResponses] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Essay drafting states
  const [isDrafting, setIsDrafting] = useState(false);
  const [essayDrafts, setEssayDrafts] = useState<Record<string, EssayDraftResult>>({});
  const [wordLimits, setWordLimits] = useState<Record<string, number>>({});
  const [targetTones, setTargetTones] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const currentItem = missingItems.find((m) => m.id === activeItem);

  const handleTextChange = (id: string, value: string) => {
    setTextResponses((prev) => ({ ...prev, [id]: value }));
  };

  const handleSaveResponse = async (item: MissingInfoDetailDTO) => {
    const response = textResponses[item.id] || item.userResponse || '';
    if (!response.trim()) {
      setErrorMessage('Please provide a response before saving.');
      return;
    }

    try {
      setIsSaving(item.id);
      setErrorMessage(null);
      await api.updateMissingInfo(applicationId, item.id, response.trim());
      onResolved();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save response');
    } finally {
      setIsSaving(null);
    }
  };

  const handleDraftEssay = async (item: MissingInfoDetailDTO) => {
    const limit = wordLimits[item.id] || 500;
    const tone = (targetTones[item.id] || 'ACADEMIC') as any;

    try {
      setIsDrafting(true);
      setErrorMessage(null);

      const result = await api.draftEssay(applicationId, {
        prompt: item.prompt,
        wordLimit: limit,
        fieldId: item.fieldId || undefined,
        targetTone: tone,
      });

      setEssayDrafts((prev) => ({ ...prev, [item.id]: result }));
      // Set the draft into the editable text response field
      setTextResponses((prev) => ({ ...prev, [item.id]: result.essayDraft }));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate AI essay draft');
    } finally {
      setIsDrafting(false);
    }
  };

  const countWords = (text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  if (missingItems.length === 0) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-emerald-900 mb-1">
          All Required Application Information Resolved!
        </h3>
        <p className="text-sm text-emerald-700">
          All mandatory portal fields have been mapped or answered. Your application is ready for final review.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Missing Information & Essay Assistant ({missingItems.filter((m) => !m.isResolved).length} pending)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Resolve required missing fields, select vault documents, or draft personal statements with AI.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {/* Main split view */}
      <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Left Column: Missing Item Tabs */}
        <div className="p-4 space-y-2 max-h-[600px] overflow-y-auto">
          {missingItems.map((item) => {
            const isSelected = item.id === activeItem;
            const categoryBadge =
              item.category === 'ESSAY_RESPONSE'
                ? { label: 'Essay', bg: 'bg-amber-100 text-amber-800' }
                : item.category === 'DOCUMENT_UPLOAD'
                ? { label: 'Document', bg: 'bg-purple-100 text-purple-800' }
                : { label: 'Profile Field', bg: 'bg-blue-100 text-blue-800' };

            return (
              <button
                key={item.id}
                onClick={() => setActiveItem(item.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${categoryBadge.bg}`}>
                    {categoryBadge.label}
                  </span>
                  {item.isResolved ? (
                    <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">Required</span>
                  )}
                </div>
                <div className="text-sm font-medium text-slate-900 line-clamp-2">
                  {item.prompt}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Column: Active Resolution Panel */}
        <div className="p-6 lg:col-span-2">
          {currentItem ? (
            <div className="space-y-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Prompt Question
                </div>
                <h4 className="text-lg font-medium text-slate-900">
                  {currentItem.prompt}
                </h4>
              </div>

              {/* Resolution by Category */}
              {currentItem.category === 'FIELD_VALUE' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Your Value
                    </label>
                    <input
                      type="text"
                      value={textResponses[currentItem.id] ?? currentItem.userResponse ?? ''}
                      onChange={(e) => handleTextChange(currentItem.id, e.target.value)}
                      placeholder="Enter value..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    onClick={() => handleSaveResponse(currentItem)}
                    disabled={isSaving === currentItem.id}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSaving === currentItem.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Response
                  </button>
                </div>
              )}

              {currentItem.category === 'DOCUMENT_UPLOAD' && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-start gap-3">
                    <Upload className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                    <div className="text-xs text-purple-900 leading-relaxed">
                      This scholarship portal requires an official document. Select an uploaded document from your vault or upload a new one.
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Select Verified Document from Vault
                    </label>
                    <select
                      value={textResponses[currentItem.id] ?? currentItem.userResponse ?? ''}
                      onChange={(e) => handleTextChange(currentItem.id, e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="">-- Choose Document --</option>
                      {currentItem.availableDocuments?.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.name} ({doc.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSaveResponse(currentItem)}
                      disabled={isSaving === currentItem.id}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Attach Document
                    </button>
                    <a
                      href="/documents"
                      target="_blank"
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      Open Document Vault in new tab →
                    </a>
                  </div>
                </div>
              )}

              {currentItem.category === 'ESSAY_RESPONSE' && (
                <div className="space-y-5">
                  {/* AI Drafting Toolbar */}
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        <span className="text-sm font-semibold text-indigo-950">
                          AI Personal Statement & Essay Assistant
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <select
                          value={wordLimits[currentItem.id] || 500}
                          onChange={(e) =>
                            setWordLimits((prev) => ({
                              ...prev,
                              [currentItem.id]: parseInt(e.target.value, 10),
                            }))
                          }
                          className="text-xs border border-indigo-300 rounded-md px-2 py-1 bg-white text-slate-800"
                        >
                          <option value={300}>~300 words</option>
                          <option value={500}>~500 words</option>
                          <option value={750}>~750 words</option>
                          <option value={1000}>~1000 words</option>
                        </select>

                        <select
                          value={targetTones[currentItem.id] || 'ACADEMIC'}
                          onChange={(e) =>
                            setTargetTones((prev) => ({
                              ...prev,
                              [currentItem.id]: e.target.value,
                            }))
                          }
                          className="text-xs border border-indigo-300 rounded-md px-2 py-1 bg-white text-slate-800"
                        >
                          <option value="ACADEMIC">Academic Tone</option>
                          <option value="MOTIVATIONAL">Motivational Tone</option>
                          <option value="PROFESSIONAL">Professional Tone</option>
                          <option value="PERSONAL">Personal Story Tone</option>
                        </select>
                      </div>
                    </div>

                    <p className="text-xs text-indigo-900/80 leading-relaxed">
                      Generates a targeted motivation essay grounded strictly in your verified education, research, and extracurricular achievements.
                    </p>

                    <button
                      onClick={() => handleDraftEssay(currentItem)}
                      disabled={isDrafting}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isDrafting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Drafting with AI Assistant...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          Generate Grounded AI Draft
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mandatory Student Review Banner */}
                  {(essayDrafts[currentItem.id] || textResponses[currentItem.id]) && (
                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div className="text-xs text-amber-900 leading-relaxed">
                        <strong className="font-semibold">Student Review & Editing Required:</strong> Admissions committees look for your genuine, authentic voice. Please read, edit, and personalize the draft below before accepting.
                      </div>
                    </div>
                  )}

                  {/* Editable Essay Textarea */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-medium text-slate-700">Your Essay Response (Editable)</span>
                      <span>
                        Words: <strong>{countWords(textResponses[currentItem.id] ?? currentItem.userResponse ?? '')}</strong>
                        {wordLimits[currentItem.id] && ` / ~${wordLimits[currentItem.id]}`}
                      </span>
                    </div>
                    <textarea
                      rows={12}
                      value={textResponses[currentItem.id] ?? currentItem.userResponse ?? ''}
                      onChange={(e) => handleTextChange(currentItem.id, e.target.value)}
                      placeholder="Type or edit your personal statement..."
                      className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans leading-relaxed text-slate-800"
                    />
                  </div>

                  {/* Key Highlights & Suggested Edits */}
                  {essayDrafts[currentItem.id] && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div>
                        <strong className="font-semibold text-slate-700 block mb-1">
                          ✓ Key Highlights Grounded:
                        </strong>
                        <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                          {essayDrafts[currentItem.id].keyHighlightsUsed.map((h, i) => (
                            <li key={i}>{h}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <strong className="font-semibold text-slate-700 block mb-1">
                          💡 Recommended Personal Additions:
                        </strong>
                        <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                          {essayDrafts[currentItem.id].suggestedEdits.map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={() => handleSaveResponse(currentItem)}
                      disabled={isSaving === currentItem.id}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isSaving === currentItem.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Accept & Save Edited Essay
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Select an item to resolve
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
