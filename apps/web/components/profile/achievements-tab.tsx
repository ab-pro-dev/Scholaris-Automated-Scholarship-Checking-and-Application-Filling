'use client';

import React, { useState } from 'react';
import { AchievementDTO } from '@scholaris/types';
import { AchievementInput, achievementSchema } from '@scholaris/validation';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { Alert } from '../ui/alert';
import { Trophy, Plus, Pencil, Trash2, Calendar, Award } from 'lucide-react';

interface AchievementsTabProps {
  records: AchievementDTO[];
  onRecordsUpdated: (records: AchievementDTO[]) => void;
}

export function AchievementsTab({ records, onRecordsUpdated }: AchievementsTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AchievementDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialForm: AchievementInput = {
    title: '',
    issuer: '',
    dateReceived: '',
    description: '',
  };

  const [formData, setFormData] = useState<AchievementInput>(initialForm);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData(initialForm);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: AchievementDTO) => {
    setEditingRecord(rec);
    setFormData({
      title: rec.title,
      issuer: rec.issuer || '',
      dateReceived: rec.dateReceived ? rec.dateReceived.slice(0, 10) : '',
      description: rec.description || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this achievement?')) return;
    try {
      await api.deleteAchievement(id);
      onRecordsUpdated(records.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete achievement.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: AchievementInput = {
      ...formData,
      issuer: formData.issuer || null,
      dateReceived: formData.dateReceived ? formData.dateReceived : null,
      description: formData.description || null,
    };

    const validation = achievementSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check form inputs.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingRecord) {
        const updated = await api.updateAchievement(editingRecord.id, validation.data);
        onRecordsUpdated(records.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await api.createAchievement(validation.data);
        onRecordsUpdated([created, ...records]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save achievement.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/90 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-slate-700" />
            Honors & Achievements
          </CardTitle>
          <CardDescription>
            Document awards, competition wins, merit fellowships, and published research.
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Achievement
        </Button>
      </CardHeader>

      <CardContent>
        {records.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
              <Award className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Honors or Awards Added</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Highlight your competitive achievements to increase your score for merit-based scholarships.
            </p>
            <Button size="sm" variant="outline" onClick={handleOpenAdd}>
              Add an Award or Honor
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="p-5 border border-slate-200/80 rounded-xl bg-white hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-slate-900">{rec.title}</h4>
                  </div>

                  {rec.issuer && (
                    <p className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                      <span className="text-slate-400">Conferred by:</span>
                      <span className="font-semibold">{rec.issuer}</span>
                    </p>
                  )}

                  {rec.description && (
                    <p className="text-xs text-slate-600 leading-relaxed pt-1">
                      {rec.description}
                    </p>
                  )}

                  {rec.dateReceived && (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        {rec.dateReceived.slice(0, 10)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(rec)}
                    leftIcon={<Pencil className="w-3.5 h-3.5" />}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(rec.id)}
                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
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
        title={editingRecord ? 'Edit Achievement' : 'Add Achievement'}
        description="Include official titles and granting organizations."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error" title="Input Error">
              {error}
            </Alert>
          )}

          <Input
            label="Achievement / Award Title"
            placeholder="e.g. Dean's Honor List, National Science Fair 1st Prize"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Granting Institution / Issuer"
              placeholder="e.g. Ministry of Education, University Dean"
              value={formData.issuer || ''}
              onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
            />
            <Input
              label="Date Received"
              type="date"
              value={formData.dateReceived || ''}
              onChange={(e) => setFormData({ ...formData, dateReceived: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
              Description / Impact (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Briefly describe the criteria, competitiveness, or significance of this honor..."
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
              {editingRecord ? 'Save Changes' : 'Add Achievement'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
