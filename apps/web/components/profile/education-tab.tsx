'use client';

import React, { useState } from 'react';
import { EducationRecordDTO } from '@scholaris/types';
import { EducationRecordInput, educationRecordSchema } from '@scholaris/validation';
import { api } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Modal } from '../ui/modal';
import { Alert } from '../ui/alert';
import {
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Award,
  BookOpen,
} from 'lucide-react';

interface EducationTabProps {
  records: EducationRecordDTO[];
  onRecordsUpdated: (records: EducationRecordDTO[]) => void;
}

export function EducationTab({ records, onRecordsUpdated }: EducationTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<EducationRecordDTO | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialForm: EducationRecordInput = {
    level: 'UNDERGRADUATE',
    institution: '',
    faculty: '',
    degree: '',
    fieldOfStudy: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    gpa: undefined,
    maxGpa: undefined,
    honors: '',
  };

  const [formData, setFormData] = useState<EducationRecordInput>(initialForm);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData(initialForm);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: EducationRecordDTO) => {
    setEditingRecord(rec);
    setFormData({
      level: rec.level,
      institution: rec.institution,
      faculty: rec.faculty || '',
      degree: rec.degree || '',
      fieldOfStudy: rec.fieldOfStudy,
      startDate: rec.startDate.slice(0, 10),
      endDate: rec.endDate ? rec.endDate.slice(0, 10) : '',
      isCurrent: rec.isCurrent,
      gpa: rec.gpa ?? undefined,
      maxGpa: rec.maxGpa ?? undefined,
      honors: rec.honors || '',
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this academic record?')) return;
    try {
      await api.deleteEducation(id);
      onRecordsUpdated(records.filter((r) => r.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete education record.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: EducationRecordInput = {
      ...formData,
      faculty: formData.faculty || null,
      degree: formData.degree || null,
      endDate: formData.endDate ? formData.endDate : null,
      gpa: formData.gpa !== undefined && !isNaN(Number(formData.gpa)) ? Number(formData.gpa) : null,
      maxGpa: formData.maxGpa !== undefined && !isNaN(Number(formData.maxGpa)) ? Number(formData.maxGpa) : null,
      honors: formData.honors || null,
    };

    const validation = educationRecordSchema.safeParse(payload);
    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Please check form inputs.');
      return;
    }

    setIsLoading(true);
    try {
      if (editingRecord) {
        const updated = await api.updateEducation(editingRecord.id, validation.data);
        onRecordsUpdated(records.map((r) => (r.id === updated.id ? updated : r)));
      } else {
        const created = await api.createEducation(validation.data);
        onRecordsUpdated([created, ...records]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save education record.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/90 shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-slate-700" />
            Education History
          </CardTitle>
          <CardDescription>
            Document your degrees, diplomas, and current studies to evaluate GPA and degree-level requirements.
          </CardDescription>
        </div>
        <Button
          size="sm"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Education
        </Button>
      </CardHeader>

      <CardContent>
        {records.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800">No Education Records Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Add your high school, undergraduate, or graduate credentials to unlock scholarship matching.
            </p>
            <Button size="sm" variant="outline" onClick={handleOpenAdd}>
              Add Your First Degree
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((rec) => (
              <div
                key={rec.id}
                className="p-5 border border-slate-200/80 rounded-xl bg-white hover:border-slate-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-base font-semibold text-slate-900">
                      {rec.institution}
                    </h4>
                    <Badge variant="navy" size="sm">
                      {rec.level.replace('_', ' ')}
                    </Badge>
                    {rec.isCurrent && (
                      <Badge variant="verified" size="sm">
                        Currently Enrolled
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs font-medium text-slate-700">
                    {rec.degree ? `${rec.degree} in ` : ''}
                    <span className="font-semibold text-slate-900">{rec.fieldOfStudy}</span>
                    {rec.faculty ? ` &bull; ${rec.faculty}` : ''}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-mono tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {rec.startDate.slice(0, 7)} &rarr; {rec.isCurrent ? 'Present' : rec.endDate?.slice(0, 7) || 'N/A'}
                    </span>

                    {rec.gpa !== null && rec.gpa !== undefined && (
                      <span className="flex items-center gap-1 font-mono tabular-nums font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-200/70">
                        GPA: {rec.gpa} {rec.maxGpa ? `/ ${rec.maxGpa}` : ''}
                      </span>
                    )}

                    {rec.honors && (
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        {rec.honors}
                      </span>
                    )}
                  </div>
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
        title={editingRecord ? 'Edit Academic Record' : 'Add Academic Record'}
        description="Provide accurate institutional and degree details for automated eligibility checks."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="error" title="Input Error">
              {error}
            </Alert>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
              Degree / Education Level *
            </label>
            <select
              value={formData.level}
              onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              required
            >
              <option value="HIGH_SCHOOL">High School / Secondary</option>
              <option value="UNDERGRADUATE">Undergraduate (Bachelor&apos;s)</option>
              <option value="POSTGRADUATE">Postgraduate (Master&apos;s)</option>
              <option value="DOCTORAL">Doctoral (PhD)</option>
            </select>
          </div>

          <Input
            label="Institution Name"
            placeholder="e.g. Addis Ababa University"
            required
            value={formData.institution}
            onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Field of Study / Major"
              placeholder="e.g. Computer Science"
              required
              value={formData.fieldOfStudy}
              onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
            />
            <Input
              label="Degree Title"
              placeholder="e.g. Bachelor of Science"
              value={formData.degree || ''}
              onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
            />
          </div>

          <Input
            label="Faculty / Department"
            placeholder="e.g. Faculty of Informatics"
            value={formData.faculty || ''}
            onChange={(e) => setFormData({ ...formData, faculty: e.target.value })}
          />

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
            <span>I am currently enrolled in this program</span>
          </label>

          <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <Input
              label="Cumulative GPA"
              type="number"
              step="0.01"
              placeholder="3.85"
              value={formData.gpa ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gpa: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
            <Input
              label="Max GPA Scale"
              type="number"
              step="0.1"
              placeholder="4.0"
              value={formData.maxGpa ?? ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  maxGpa: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
            <Input
              label="Honors (Optional)"
              placeholder="e.g. Magna Cum Laude"
              value={formData.honors || ''}
              onChange={(e) => setFormData({ ...formData, honors: e.target.value })}
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
              {editingRecord ? 'Save Changes' : 'Add Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
}
