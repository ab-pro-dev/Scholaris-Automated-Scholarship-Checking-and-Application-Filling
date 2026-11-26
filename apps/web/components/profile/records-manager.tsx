'use client';

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  EducationLevel,
  EducationRecordDTO,
  LanguageSkillDTO,
  LanguageTestType,
  AchievementDTO,
  ExperienceDTO,
  ExperienceType,
} from '@scholaris/types';
import {
  educationRecordSchema,
  languageSkillSchema,
  achievementSchema,
  experienceSchema,
} from '@scholaris/validation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert } from '@/components/ui/alert';

const FIELD_CLASS =
  'w-full h-10 px-3 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action transition-colors';

function fmtDate(d?: string | null): string {
  if (!d) return '';
  return d.slice(0, 10);
}

interface SectionShellProps {
  title: string;
  description: string;
  count: number;
  isFormOpen: boolean;
  onOpenNew: () => void;
  error: string | null;
  children: React.ReactNode;
}

function SectionShell({
  title,
  description,
  count,
  isFormOpen,
  onOpenNew,
  error,
  children,
}: SectionShellProps) {
  return (
    <section className="bg-surface border border-line rounded-2xl p-6 shadow-card space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <Badge variant="neutral" className="tabular-nums">
              {count}
            </Badge>
          </div>
          <p className="text-sm text-ink-muted">{description}</p>
        </div>
        {!isFormOpen && (
          <Button variant="secondary" onClick={onOpenNew} className="h-10 shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            Add Entry
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="error" title="Could not update record">
          {error}
        </Alert>
      )}

      {children}
    </section>
  );
}

// ==========================================
// Education Section
// ==========================================

export function EducationSection({
  items,
  onChange,
}: {
  items: EducationRecordDTO[];
  onChange: (next: EducationRecordDTO[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [level, setLevel] = useState<EducationLevel>('UNDERGRADUATE');
  const [institution, setInstitution] = useState('');
  const [fieldOfStudy, setFieldOfStudy] = useState('');
  const [degree, setDegree] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [gpa, setGpa] = useState('');
  const [maxGpa, setMaxGpa] = useState('4.0');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setEditingId('new');
    setLevel('UNDERGRADUATE');
    setInstitution('');
    setFieldOfStudy('');
    setDegree('');
    setStartDate('');
    setEndDate('');
    setIsCurrent(false);
    setGpa('');
    setMaxGpa('4.0');
    setError(null);
  };

  const openEdit = (rec: EducationRecordDTO) => {
    setEditingId(rec.id);
    setLevel(rec.level);
    setInstitution(rec.institution);
    setFieldOfStudy(rec.fieldOfStudy);
    setDegree(rec.degree ?? '');
    setStartDate(fmtDate(rec.startDate));
    setEndDate(fmtDate(rec.endDate));
    setIsCurrent(rec.isCurrent);
    setGpa(rec.gpa != null ? String(rec.gpa) : '');
    setMaxGpa(rec.maxGpa != null ? String(rec.maxGpa) : '4.0');
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = educationRecordSchema.safeParse({
      level,
      institution,
      fieldOfStudy,
      degree: degree.trim() || null,
      startDate,
      endDate: isCurrent ? null : endDate.trim() || null,
      isCurrent,
      gpa: gpa.trim() ? Number(gpa) : null,
      maxGpa: maxGpa.trim() ? Number(maxGpa) : null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check education fields.');
      return;
    }

    try {
      setBusy(true);
      if (editingId === 'new') {
        const created = await api.createEducation(parsed.data);
        onChange([created, ...items]);
      } else if (editingId) {
        const updated = await api.updateEducation(editingId, parsed.data);
        onChange(items.map((i) => (i.id === editingId ? updated : i)));
      }
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save education.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusy(true);
      setError(null);
      await api.deleteEducation(id);
      onChange(items.filter((i) => i.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete education.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell
      title="Education history"
      description="Degrees, institutions, and GPA records used for eligibility verification."
      count={items.length}
      isFormOpen={editingId !== null}
      onOpenNew={openNew}
      error={error}
    >
      {editingId !== null && (
        <form onSubmit={handleSave} className="bg-canvas border border-line rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as EducationLevel)}
                className={FIELD_CLASS}
              >
                <option value="HIGH_SCHOOL">High School</option>
                <option value="UNDERGRADUATE">Undergraduate</option>
                <option value="POSTGRADUATE">Postgraduate</option>
                <option value="DOCTORAL">Doctoral</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Institution</label>
              <input
                type="text"
                required
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="e.g. Cairo University"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Field of study</label>
              <input
                type="text"
                required
                value={fieldOfStudy}
                onChange={(e) => setFieldOfStudy(e.target.value)}
                placeholder="e.g. Computer Science"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Degree title (optional)</label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.Sc. Honors"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Start date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">End date</label>
              <input
                type="date"
                disabled={isCurrent}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">GPA (optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="10"
                value={gpa}
                onChange={(e) => setGpa(e.target.value)}
                placeholder="3.85"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Max GPA scale</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={maxGpa}
                onChange={(e) => setMaxGpa(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-line text-action focus:ring-action"
            />
            Currently enrolled here
          </label>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditingId(null)} disabled={busy}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Check className="w-4 h-4 mr-1" />
              {busy ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No education records added yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((rec) => (
            <li
              key={rec.id}
              className="border border-line rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{rec.institution}</span>
                  <Badge variant="neutral">{rec.level.replace(/_/g, ' ')}</Badge>
                  {rec.gpa != null && (
                    <Badge variant="verified" className="tabular-nums">
                      GPA {rec.gpa}/{rec.maxGpa ?? 4}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-ink-muted">
                  {rec.degree ? `${rec.degree} · ` : ''}
                  {rec.fieldOfStudy} · {fmtDate(rec.startDate)} – {rec.isCurrent ? 'Present' : fmtDate(rec.endDate) || 'N/A'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(rec)} aria-label={`Edit ${rec.institution}`}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(rec.id)} aria-label={`Delete ${rec.institution}`}>
                  <Trash2 className="w-3.5 h-3.5 text-danger-text" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

// ==========================================
// Languages Section
// ==========================================

export function LanguagesSection({
  items,
  onChange,
}: {
  items: LanguageSkillDTO[];
  onChange: (next: LanguageSkillDTO[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [language, setLanguage] = useState('');
  const [isNative, setIsNative] = useState(false);
  const [proficiencyLevel, setProficiencyLevel] = useState('');
  const [testType, setTestType] = useState<LanguageTestType | ''>('');
  const [testScore, setTestScore] = useState('');
  const [testDate, setTestDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setEditingId('new');
    setLanguage('');
    setIsNative(false);
    setProficiencyLevel('');
    setTestType('');
    setTestScore('');
    setTestDate('');
    setError(null);
  };

  const openEdit = (rec: LanguageSkillDTO) => {
    setEditingId(rec.id);
    setLanguage(rec.language);
    setIsNative(rec.isNative);
    setProficiencyLevel(rec.proficiencyLevel ?? '');
    setTestType(rec.testType ?? '');
    setTestScore(rec.testScore ?? '');
    setTestDate(fmtDate(rec.testDate));
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = languageSkillSchema.safeParse({
      language,
      isNative,
      proficiencyLevel: proficiencyLevel.trim() || null,
      testType: testType || null,
      testScore: testScore.trim() || null,
      testDate: testDate.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check language fields.');
      return;
    }

    try {
      setBusy(true);
      if (editingId === 'new') {
        const created = await api.createLanguage(parsed.data);
        onChange([...items, created]);
      } else if (editingId) {
        const updated = await api.updateLanguage(editingId, parsed.data);
        onChange(items.map((i) => (i.id === editingId ? updated : i)));
      }
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save language.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusy(true);
      setError(null);
      await api.deleteLanguage(id);
      onChange(items.filter((i) => i.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete language.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell
      title="Languages & test scores"
      description="Native languages and standardized test scores (IELTS, TOEFL, Duolingo)."
      count={items.length}
      isFormOpen={editingId !== null}
      onOpenNew={openNew}
      error={error}
    >
      {editingId !== null && (
        <form onSubmit={handleSave} className="bg-canvas border border-line rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Language</label>
              <input
                type="text"
                required
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="e.g. English"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Proficiency (CEFR / level)</label>
              <input
                type="text"
                value={proficiencyLevel}
                onChange={(e) => setProficiencyLevel(e.target.value)}
                placeholder="e.g. C1 / Fluent"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Test type</label>
              <select
                value={testType}
                onChange={(e) => setTestType(e.target.value as LanguageTestType | '')}
                className={FIELD_CLASS}
              >
                <option value="">None</option>
                <option value="IELTS">IELTS</option>
                <option value="TOEFL">TOEFL</option>
                <option value="DUOLINGO">Duolingo</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Test score</label>
              <input
                type="text"
                value={testScore}
                onChange={(e) => setTestScore(e.target.value)}
                placeholder="e.g. 7.5"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Test date</label>
              <input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isNative}
              onChange={(e) => setIsNative(e.target.checked)}
              className="rounded border-line text-action focus:ring-action"
            />
            Native speaker
          </label>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditingId(null)} disabled={busy}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Check className="w-4 h-4 mr-1" />
              {busy ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No language skills recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((rec) => (
            <li
              key={rec.id}
              className="border border-line rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{rec.language}</span>
                  {rec.isNative && <Badge variant="verified">Native</Badge>}
                  {rec.testType && rec.testType !== 'NONE' && (
                    <Badge variant="neutral">
                      {rec.testType} {rec.testScore ? `· ${rec.testScore}` : ''}
                    </Badge>
                  )}
                </div>
                {rec.proficiencyLevel && (
                  <p className="text-xs text-ink-muted">{rec.proficiencyLevel}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(rec)} aria-label={`Edit ${rec.language}`}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(rec.id)} aria-label={`Delete ${rec.language}`}>
                  <Trash2 className="w-3.5 h-3.5 text-danger-text" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

// ==========================================
// Achievements Section
// ==========================================

export function AchievementsSection({
  items,
  onChange,
}: {
  items: AchievementDTO[];
  onChange: (next: AchievementDTO[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [dateReceived, setDateReceived] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setEditingId('new');
    setTitle('');
    setIssuer('');
    setDateReceived('');
    setDescription('');
    setError(null);
  };

  const openEdit = (rec: AchievementDTO) => {
    setEditingId(rec.id);
    setTitle(rec.title);
    setIssuer(rec.issuer ?? '');
    setDateReceived(fmtDate(rec.dateReceived));
    setDescription(rec.description ?? '');
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = achievementSchema.safeParse({
      title,
      issuer: issuer.trim() || null,
      dateReceived: dateReceived.trim() || null,
      description: description.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check achievement fields.');
      return;
    }

    try {
      setBusy(true);
      if (editingId === 'new') {
        const created = await api.createAchievement(parsed.data);
        onChange([created, ...items]);
      } else if (editingId) {
        const updated = await api.updateAchievement(editingId, parsed.data);
        onChange(items.map((i) => (i.id === editingId ? updated : i)));
      }
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save achievement.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusy(true);
      setError(null);
      await api.deleteAchievement(id);
      onChange(items.filter((i) => i.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete achievement.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell
      title="Honors & achievements"
      description="Awards, competitions, publications, and academic distinctions used in AI essay drafting."
      count={items.length}
      isFormOpen={editingId !== null}
      onOpenNew={openNew}
      error={error}
    >
      {editingId !== null && (
        <form onSubmit={handleSave} className="bg-canvas border border-line rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dean's List Honor"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Issuer (optional)</label>
              <input
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="e.g. Faculty of Engineering"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Date received</label>
              <input
                type="date"
                value={dateReceived}
                onChange={(e) => setDateReceived(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Description (optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-surface border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-action"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditingId(null)} disabled={busy}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Check className="w-4 h-4 mr-1" />
              {busy ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No achievements recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((rec) => (
            <li
              key={rec.id}
              className="border border-line rounded-xl p-4 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <p className="font-medium text-ink">{rec.title}</p>
                <p className="text-xs text-ink-muted">
                  {[rec.issuer, fmtDate(rec.dateReceived)].filter(Boolean).join(' · ') || 'Details not specified'}
                </p>
                {rec.description && (
                  <p className="text-xs text-ink-muted leading-relaxed pt-1">{rec.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(rec)} aria-label={`Edit ${rec.title}`}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(rec.id)} aria-label={`Delete ${rec.title}`}>
                  <Trash2 className="w-3.5 h-3.5 text-danger-text" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}

// ==========================================
// Experience Section
// ==========================================

export function ExperiencesSection({
  items,
  onChange,
}: {
  items: ExperienceDTO[];
  onChange: (next: ExperienceDTO[]) => void;
}) {
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [type, setType] = useState<ExperienceType>('WORK');
  const [organization, setOrganization] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openNew = () => {
    setEditingId('new');
    setType('WORK');
    setOrganization('');
    setRoleTitle('');
    setStartDate('');
    setEndDate('');
    setIsCurrent(false);
    setDescription('');
    setError(null);
  };

  const openEdit = (rec: ExperienceDTO) => {
    setEditingId(rec.id);
    setType(rec.type);
    setOrganization(rec.organization);
    setRoleTitle(rec.roleTitle);
    setStartDate(fmtDate(rec.startDate));
    setEndDate(fmtDate(rec.endDate));
    setIsCurrent(rec.isCurrent);
    setDescription(rec.description ?? '');
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = experienceSchema.safeParse({
      type,
      organization,
      roleTitle,
      startDate,
      endDate: isCurrent ? null : endDate.trim() || null,
      isCurrent,
      description: description.trim() || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Check experience fields.');
      return;
    }

    try {
      setBusy(true);
      if (editingId === 'new') {
        const created = await api.createExperience(parsed.data);
        onChange([created, ...items]);
      } else if (editingId) {
        const updated = await api.updateExperience(editingId, parsed.data);
        onChange(items.map((i) => (i.id === editingId ? updated : i)));
      }
      setEditingId(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save experience.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setBusy(true);
      setError(null);
      await api.deleteExperience(id);
      onChange(items.filter((i) => i.id !== id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete experience.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionShell
      title="Work, research & leadership"
      description="Relevant experience for merit and leadership scholarship evaluations."
      count={items.length}
      isFormOpen={editingId !== null}
      onOpenNew={openNew}
      error={error}
    >
      {editingId !== null && (
        <form onSubmit={handleSave} className="bg-canvas border border-line rounded-xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ExperienceType)}
                className={FIELD_CLASS}
              >
                <option value="WORK">Work</option>
                <option value="RESEARCH">Research</option>
                <option value="VOLUNTEER">Volunteer</option>
                <option value="LEADERSHIP">Leadership</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Organization</label>
              <input
                type="text"
                required
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Open Science Lab"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Role title</label>
              <input
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="e.g. Research Assistant"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Start date</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">End date</label>
              <input
                type="date"
                disabled={isCurrent}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={FIELD_CLASS}
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => setIsCurrent(e.target.checked)}
              className="rounded border-line text-action focus:ring-action"
            />
            Current role
          </label>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Description (optional)</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 bg-surface border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-action"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditingId(null)} disabled={busy}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              <Check className="w-4 h-4 mr-1" />
              {busy ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-ink-muted">No experience entries recorded yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((rec) => (
            <li
              key={rec.id}
              className="border border-line rounded-xl p-4 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-ink">{rec.roleTitle}</span>
                  <Badge variant="neutral">{rec.type}</Badge>
                </div>
                <p className="text-xs text-ink-muted">
                  {rec.organization} · {fmtDate(rec.startDate)} – {rec.isCurrent ? 'Present' : fmtDate(rec.endDate) || 'N/A'}
                </p>
                {rec.description && (
                  <p className="text-xs text-ink-muted leading-relaxed pt-1">{rec.description}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEdit(rec)} aria-label={`Edit ${rec.roleTitle}`}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(rec.id)} aria-label={`Delete ${rec.roleTitle}`}>
                  <Trash2 className="w-3.5 h-3.5 text-danger-text" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionShell>
  );
}
