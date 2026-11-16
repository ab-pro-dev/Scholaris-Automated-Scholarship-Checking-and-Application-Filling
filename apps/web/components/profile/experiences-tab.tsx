'use client';

import React, { useState } from 'react';
import { ExperienceDTO } from '@scholaris/types';
import { ExperienceInput, experienceSchema } from '@scholaris/validation';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { Alert } from '../ui/alert';
import { Briefcase, Plus, Pencil, Trash2, Calendar, Building2 } from 'lucide-react';

interface ExperiencesTabProps {
  records: ExperienceDTO[];
  onRecordsUpdated: (records: ExperienceDTO[]) => void;
}

export function ExperiencesTab({ records, onRecordsUpdated }: ExperiencesTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExperienceDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialForm: ExperienceInput = {
    type: 'RESEARCH',
    organization: '',
    roleTitle: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    description: '',
  };

  const [formData, setFormData] = useState<ExperienceInput>(initialForm);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData(initialForm);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: ExperienceDTO) => {
    setEditingRecord(rec);
    setFormData({
      type: rec.type,
      organization: rec.organization,
      roleTitle: rec.roleTitle,
      startDate: rec.startDate.slice(0, 10),
      endDate: rec.endDate ? rec.endDate.slice(0, 10) : '',
      isCurrent: rec.isCurrent,
      description: rec.description || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this experience?')) return;
    try {
      await api.deleteExperience(id);
      onRecordsUpdated(records.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete experience.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: ExperienceInput = {
      ...formData,
      endDate: formData.endDate ? formData.endDate : null,
      description: formData.description || null,
    };

    const validation = experienceSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check form inputs.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingRecord) {
        const updated = await api.updateExperience(editingRecord.id, validation.data);
        onRecordsUpdated(records.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await api.createExperience(validation.data);
        onRecordsUpdated([created, ...records]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save experience.');
    } finally {
      setIsLoading(false);
    }
  };

  const typeBadges = {
    RESEARCH: <Badge variant="navy" size="sm">Research</Badge>,
    WORK: <Badge variant="neutral" size="sm">Work</Badge>,
    LEADERSHIP: <Badge variant="uncertain" size="sm">Leadership</Badge>,
    VOLUNTEER: <Badge variant="verified" size="sm">Volunteer</Badge>,
  };

  return (
    <Card className="border-slate-200/90 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-slate-700" />
            Experience & Leadership
          </CardTitle>
          <CardDescription>
            Highlight research assistantships, professional internships, community service, and extracurricular leadership.
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Experience
        </Button>
      </CardHeader>

      <CardContent>
        {records.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
              <Building2 className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Experiences Listed</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add internships, undergraduate research, or student leadership roles to strengthen scholarship applications.
            </p>
            <Button size="sm" variant="outline" onClick={handleOpenAdd}>
              Add an Experience
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
                    <h4 className="text-base font-semibold text-slate-900">{rec.roleTitle}</h4>
                    {typeBadges[rec.type]}
                    {rec.isCurrent && (
                      <Badge variant="verified" size="sm">
                        Present
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>{rec.organization}</span>
                  </p>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono tabular-nums pt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      {rec.startDate.slice(0, 7)} &rarr; {rec.isCurrent ? 'Present' : rec.endDate?.slice(0, 7) || 'N/A'}
                    </span>
                  </div>

                  {rec.description && (
                    <p className="text-xs text-slate-600 leading-relaxed pt-1.5 whitespace-pre-line">
                      {rec.description}
                    </p>
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
        title={editingRecord ? 'Edit Experience' : 'Add Experience'}
        description="Detail your responsibilities and significant outcomes."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error" title="Input Error">
              {error}
            </Alert>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
              Category *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            >
              <option value="RESEARCH">Research / Academic Project</option>
              <option value="WORK">Professional Work / Internship</option>
              <option value="LEADERSHIP">Student Organization / Leadership</option>
              <option value="VOLUNTEER">Community Service / Volunteer</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Role / Title"
              placeholder="e.g. Research Assistant, President"
              required
              value={formData.roleTitle}
              onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
            />
            <Input
              label="Organization / Company"
              placeholder="e.g. Lab of AI, Robotics Club"
              required
              value={formData.organization}
              onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date"
              type="date"
              required
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              disabled={formData.isCurrent}
              value={formData.endDate || ''}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
            <input
              type="checkbox"
              checked={formData.isCurrent}
              onChange={(e) => setFormData({ ...formData, isCurrent: e.target.checked })}
              className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
            />
            <span>I am currently active in this role</span>
          </label>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
              Key Contributions & Highlights (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Describe your primary research goals, key initiatives led, or measurable outcomes..."
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
              {editingRecord ? 'Save Changes' : 'Add Experience'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
