'use client';

import React, { useState } from 'react';
import { LanguageSkillDTO } from '@scholaris/types';
import { LanguageSkillInput, languageSkillSchema } from '@scholaris/validation';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { Alert } from '../ui/alert';
import { Languages, Plus, Pencil, Trash2, Calendar, CheckCircle2 } from 'lucide-react';

interface LanguagesTabProps {
  records: LanguageSkillDTO[];
  onRecordsUpdated: (records: LanguageSkillDTO[]) => void;
}

export function LanguagesTab({ records, onRecordsUpdated }: LanguagesTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LanguageSkillDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialForm: LanguageSkillInput = {
    language: '',
    isNative: false,
    proficiencyLevel: '',
    testType: 'NONE',
    testScore: '',
    testDate: '',
  };

  const [formData, setFormData] = useState<LanguageSkillInput>(initialForm);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData(initialForm);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: LanguageSkillDTO) => {
    setEditingRecord(rec);
    setFormData({
      language: rec.language,
      isNative: rec.isNative,
      proficiencyLevel: rec.proficiencyLevel || '',
      testType: rec.testType || 'NONE',
      testScore: rec.testScore || '',
      testDate: rec.testDate ? rec.testDate.slice(0, 10) : '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this language skill?')) return;
    try {
      await api.deleteLanguage(id);
      onRecordsUpdated(records.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete language skill.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: LanguageSkillInput = {
      ...formData,
      proficiencyLevel: formData.proficiencyLevel || null,
      testType: formData.testType === 'NONE' ? null : formData.testType,
      testScore: formData.testScore || null,
      testDate: formData.testDate ? formData.testDate : null,
    };

    const validation = languageSkillSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check form inputs.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingRecord) {
        const updated = await api.updateLanguage(editingRecord.id, validation.data);
        onRecordsUpdated(records.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await api.createLanguage(validation.data);
        onRecordsUpdated([created, ...records]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save language skill.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/90 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-slate-700" />
            Language Proficiency
          </CardTitle>
          <CardDescription>
            Record native languages, certified test results (IELTS, TOEFL, Duolingo), and CEFR fluency levels.
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Language
        </Button>
      </CardHeader>

      <CardContent>
        {records.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
              <Languages className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Languages Added</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your language proficiencies to ensure you match international scholarship language criteria.
            </p>
            <Button size="sm" variant="outline" onClick={handleOpenAdd}>
              Add Native or Fluent Language
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="p-5 border border-slate-200/80 rounded-xl bg-white hover:border-slate-300 transition-colors flex items-start justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-semibold text-slate-900">{rec.language}</h4>
                    {rec.isNative ? (
                      <Badge variant="verified" size="sm">
                        Native
                      </Badge>
                    ) : (
                      <Badge variant="navy" size="sm">
                        {rec.proficiencyLevel || 'Proficient'}
                      </Badge>
                    )}
                  </div>

                  {rec.testType && rec.testType !== 'NONE' && (
                    <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/70">
                      <span className="font-semibold text-slate-800">{rec.testType}:</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {rec.testScore || 'Score not provided'}
                      </span>
                      {rec.testDate && (
                        <span className="text-[11px] text-slate-400 font-mono tabular-nums ml-auto flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {rec.testDate.slice(0, 10)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(rec)}
                    className="p-1.5 text-slate-500 hover:text-slate-800"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(rec.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRecord ? 'Edit Language Skill' : 'Add Language Skill'}
        description="Specify proficiency and test scores for requirements verification."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error" title="Input Error">
              {error}
            </Alert>
          )}

          <Input
            label="Language Name"
            placeholder="e.g. English, French, Amharic, German"
            required
            value={formData.language}
            onChange={(e) => setFormData({ ...formData, language: e.target.value })}
          />

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={formData.isNative}
              onChange={(e) => setFormData({ ...formData, isNative: e.target.checked })}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span>This is my native / mother tongue language</span>
          </label>

          {!formData.isNative && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Proficiency Level (CEFR / Descriptive)
              </label>
              <select
                value={formData.proficiencyLevel || ''}
                onChange={(e) => setFormData({ ...formData, proficiencyLevel: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="">Select proficiency level</option>
                <option value="C2 Mastery / Near-Native">C2 Mastery / Near-Native</option>
                <option value="C1 Advanced / Fluent">C1 Advanced / Fluent</option>
                <option value="B2 Vantage / Upper Intermediate">B2 Vantage / Upper Intermediate</option>
                <option value="B1 Threshold / Intermediate">B1 Threshold / Intermediate</option>
                <option value="A2 Waystage / Elementary">A2 Waystage / Elementary</option>
                <option value="A1 Breakthrough / Beginner">A1 Breakthrough / Beginner</option>
              </select>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Standardized Language Test (Optional)
            </h5>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Test Provider
                </label>
                <select
                  value={formData.testType || 'NONE'}
                  onChange={(e) => setFormData({ ...formData, testType: e.target.value as any })}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="NONE">No Official Test Taken</option>
                  <option value="IELTS">IELTS Academic</option>
                  <option value="TOEFL">TOEFL iBT</option>
                  <option value="DUOLINGO">Duolingo English Test</option>
                  <option value="OTHER">Other Certified Test</option>
                </select>
              </div>

              <Input
                label="Overall Score / Band"
                placeholder="e.g. 8.0, 110, 135"
                disabled={formData.testType === 'NONE'}
                value={formData.testScore || ''}
                onChange={(e) => setFormData({ ...formData, testScore: e.target.value })}
              />
            </div>

            <Input
              label="Test Date"
              type="date"
              disabled={formData.testType === 'NONE'}
              value={formData.testDate || ''}
              onChange={(e) => setFormData({ ...formData, testDate: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isLoading}>
              {editingRecord ? 'Save Changes' : 'Add Skill'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
