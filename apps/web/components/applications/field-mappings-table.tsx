'use client';

import React, { useState } from 'react';
import { FieldMappingDTO, ApplicationFieldDTO } from '@scholaris/types';
import { CheckCircle2, Edit2, AlertCircle, FileText, UserCheck, Sparkles, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface FieldMappingItem extends FieldMappingDTO {
  field?: ApplicationFieldDTO | null;
}

interface FieldMappingsTableProps {
  applicationId: string;
  mappings: FieldMappingItem[];
  onUpdated: () => void;
}

export function FieldMappingsTable({
  applicationId,
  mappings,
  onUpdated,
}: FieldMappingsTableProps) {
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (mapping: FieldMappingItem) => {
    setEditingFieldId(mapping.fieldId);
    setEditValue(mapping.mappedValue);
  };

  const handleSave = async (fieldId: string) => {
    try {
      setIsSaving(true);
      await api.updateFieldMapping(applicationId, fieldId, editValue);
      setEditingFieldId(null);
      onUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update field');
    } finally {
      setIsSaving(false);
    }
  };

  const getSourceBadge = (sourceType: string, isEdited: boolean) => {
    if (isEdited) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
          <UserCheck className="w-3 h-3" /> User Edited
        </span>
      );
    }
    switch (sourceType) {
      case 'PROFILE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800">
            Profile Verified
          </span>
        );
      case 'DOCUMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-100 text-purple-800">
            <FileText className="w-3 h-3" /> Document Vault
          </span>
        );
      case 'AI_DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800">
            <Sparkles className="w-3 h-3" /> AI Draft (Review Needed)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-800">
            User Input
          </span>
        );
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Discovered Application Form Fields ({mappings.length})
          </h3>
          <p className="text-xs text-slate-500">
            All fields mapped to your profile. You can review and manually edit any value.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Field Label & Key</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Mapped Value</th>
              <th className="py-3 px-4">Source</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {mappings.map((m) => {
              const isEditing = editingFieldId === m.fieldId;
              const confidencePct = Math.round(m.confidence * 100);

              return (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900">
                      {m.field?.label || m.fieldId}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {m.field?.fieldKey || ''}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {m.field?.fieldType || 'TEXT'}
                    </span>
                  </td>

                  <td className="py-3 px-4 max-w-xs">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-indigo-400 rounded focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSave(m.fieldId)}
                          disabled={isSaving}
                          className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="truncate text-slate-800 text-xs font-medium">
                        {m.mappedValue ? (
                          m.mappedValue
                        ) : (
                          <span className="text-slate-400 italic font-normal">
                            Not mapped (Missing)
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {getSourceBadge(m.sourceType, m.isEditedByUser)}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            confidencePct >= 80
                              ? 'bg-emerald-500'
                              : confidencePct >= 50
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${confidencePct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500 font-mono font-medium">
                        {confidencePct}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-right">
                    {!isEditing && (
                      <button
                        onClick={() => startEdit(m)}
                        className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit Value"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
