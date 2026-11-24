'use client';

import React, { useState } from 'react';
import {
  User,
  FileText,
  Sparkles,
  CheckCircle2,
  Edit2,
  Save,
  X,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ReviewFieldItem } from '@scholaris/types';

interface ReviewFieldRowProps {
  field: ReviewFieldItem;
  applicationId: string;
  onSave: (fieldId: string, newValue: string) => Promise<void>;
}

export function ReviewFieldRow({ field, applicationId, onSave }: ReviewFieldRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(field.mappedValue || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrorMessage(null);
      await onSave(field.fieldId, editValue);
      setIsEditing(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update field');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(field.mappedValue || '');
    setIsEditing(false);
    setErrorMessage(null);
  };

  const getSourceBadge = () => {
    switch (field.sourceType) {
      case 'PROFILE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <User className="w-3 h-3" /> Profile Data
            {field.sourcePath && <span className="opacity-75 font-normal">({field.sourcePath})</span>}
          </span>
        );
      case 'DOCUMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
            <FileText className="w-3 h-3" /> Document Vault
          </span>
        );
      case 'USER_INPUT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Student Provided
          </span>
        );
      case 'AI_DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Sparkles className="w-3 h-3" /> AI Draft (Reviewed)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <HelpCircle className="w-3 h-3" /> Manual
          </span>
        );
    }
  };

  const isLongText = (field.mappedValue || '').length > 180 || field.fieldType === 'TEXTAREA';

  return (
    <div className="p-4 bg-white hover:bg-slate-50/70 border-b border-slate-100 last:border-b-0 transition-colors">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        {/* Left Column: Field Meta */}
        <div className="space-y-1.5 md:w-1/3 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900">
              {field.label}
            </span>
            {field.isRequired && (
              <span className="text-[11px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-sm">
                Required
              </span>
            )}
            <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600">
              {field.fieldType}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {getSourceBadge()}
            {field.confidence > 0 && (
              <span className="text-xs text-slate-500 font-medium">
                {Math.round(field.confidence * 100)}% match
              </span>
            )}
            {field.isEditedByUser && (
              <span className="text-[11px] text-emerald-700 font-medium">
                • Edited
              </span>
            )}
          </div>
        </div>

        {/* Center / Right: Value or In-Place Edit Input */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3 p-3 bg-slate-50 border border-indigo-200 rounded-xl">
              {field.fieldType === 'TEXTAREA' ? (
                <textarea
                  rows={4}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-sm p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                  placeholder={`Enter ${field.label}...`}
                />
              ) : field.fieldType === 'SELECT' && field.options && field.options.length > 0 ? (
                <select
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                >
                  <option value="">-- Select option --</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.fieldType === 'DATE' ? 'date' : 'text'}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full text-sm p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden bg-white text-slate-900"
                  placeholder={`Enter ${field.label}...`}
                />
              )}

              {errorMessage && (
                <p className="text-xs text-red-600 font-medium">{errorMessage}</p>
              )}

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" /> Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {field.mappedValue ? (
                  <div className="text-sm text-slate-900 leading-relaxed font-normal">
                    {isLongText && !isExpanded ? (
                      <div>
                        <p className="line-clamp-2">{field.mappedValue}</p>
                        <button
                          type="button"
                          onClick={() => setIsExpanded(true)}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Show full text <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p className="whitespace-pre-wrap">{field.mappedValue}</p>
                        {isLongText && (
                          <button
                            type="button"
                            onClick={() => setIsExpanded(false)}
                            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Collapse <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>No value provided</span>
                  </div>
                )}
              </div>

              <div className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition-colors"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
