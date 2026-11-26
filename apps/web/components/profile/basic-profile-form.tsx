'use client';

import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { Gender, UserProfileDTO } from '@scholaris/types';
import { updateProfileSchema } from '@scholaris/validation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface BasicProfileFormProps {
  profile: UserProfileDTO | null;
  onSaved: (updated: UserProfileDTO) => void;
}

const INPUT_CLASS =
  'w-full h-10 px-3 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action transition-colors';

function toDateInputValue(val?: string | null): string {
  if (!val) return '';
  return val.slice(0, 10);
}

export function BasicProfileForm({ profile, onSaved }: BasicProfileFormProps) {
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [nationality, setNationality] = useState('');
  const [residenceCountry, setResidenceCountry] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [altEmail, setAltEmail] = useState('');
  const [familyIncomeTier, setFamilyIncomeTier] = useState('');
  const [financialStatement, setFinancialStatement] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName ?? '');
    setMiddleName(profile.middleName ?? '');
    setLastName(profile.lastName ?? '');
    setDateOfBirth(toDateInputValue(profile.dateOfBirth));
    setGender(profile.gender ?? '');
    setNationality(profile.nationality ?? '');
    setResidenceCountry(profile.residenceCountry ?? '');
    setCity(profile.city ?? '');
    setAddress(profile.address ?? '');
    setPhone(profile.phone ?? '');
    setAltEmail(profile.altEmail ?? '');
    setFamilyIncomeTier(profile.familyIncomeTier ?? '');
    setFinancialStatement(profile.financialStatement ?? '');
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMessage(null);

    const payload = {
      firstName: firstName.trim() || undefined,
      middleName: middleName.trim() || null,
      lastName: lastName.trim() || undefined,
      dateOfBirth: dateOfBirth.trim() || null,
      gender: gender || null,
      nationality: nationality.trim() || undefined,
      residenceCountry: residenceCountry.trim() || undefined,
      city: city.trim() || undefined,
      address: address.trim() || null,
      phone: phone.trim() || null,
      altEmail: altEmail.trim() || null,
      familyIncomeTier: familyIncomeTier.trim() || null,
      financialStatement: financialStatement.trim() || null,
    };

    const parsed = updateProfileSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please review highlighted fields.');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await api.updateProfile(parsed.data);
      setSavedMessage('Personal profile saved.');
      onSaved(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-line rounded-2xl p-6 shadow-card space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h2 className="text-base font-semibold text-ink">
            Personal &amp; contact details
          </h2>
          <p className="text-sm text-ink-muted">
            Used for eligibility matching and pre-filling scholarship application forms.
          </p>
        </div>
        <Button type="submit" disabled={isSaving} className="h-11 px-5 shrink-0">
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {error && (
        <Alert variant="error" title="Could not save profile">
          {error}
        </Alert>
      )}
      {savedMessage && (
        <Alert variant="success" title="Saved">
          {savedMessage}
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="profile-first-name" className="block text-xs font-medium text-ink-muted mb-1">
            First name
          </label>
          <input
            id="profile-first-name"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="profile-middle-name" className="block text-xs font-medium text-ink-muted mb-1">
            Middle name
          </label>
          <input
            id="profile-middle-name"
            type="text"
            value={middleName}
            onChange={(e) => setMiddleName(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="profile-last-name" className="block text-xs font-medium text-ink-muted mb-1">
            Last name
          </label>
          <input
            id="profile-last-name"
            type="text"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="profile-dob" className="block text-xs font-medium text-ink-muted mb-1">
            Date of birth
          </label>
          <input
            id="profile-dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="profile-gender" className="block text-xs font-medium text-ink-muted mb-1">
            Gender
          </label>
          <select
            id="profile-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as Gender | '')}
            className={INPUT_CLASS}
          >
            <option value="">Select</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="OTHER">Other</option>
            <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
          </select>
        </div>
        <div>
          <label htmlFor="profile-nationality" className="block text-xs font-medium text-ink-muted mb-1">
            Nationality / Citizenship
          </label>
          <input
            id="profile-nationality"
            type="text"
            placeholder="e.g. Egyptian"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="profile-residence" className="block text-xs font-medium text-ink-muted mb-1">
            Country of residence
          </label>
          <input
            id="profile-residence"
            type="text"
            placeholder="e.g. Egypt"
            value={residenceCountry}
            onChange={(e) => setResidenceCountry(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="profile-city" className="block text-xs font-medium text-ink-muted mb-1">
            City
          </label>
          <input
            id="profile-city"
            type="text"
            placeholder="e.g. Cairo"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="profile-phone" className="block text-xs font-medium text-ink-muted mb-1">
            Phone number
          </label>
          <input
            id="profile-phone"
            type="tel"
            placeholder="+20 100 000 0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="profile-address" className="block text-xs font-medium text-ink-muted mb-1">
            Mailing address
          </label>
          <input
            id="profile-address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="profile-alt-email" className="block text-xs font-medium text-ink-muted mb-1">
            Alternate email
          </label>
          <input
            id="profile-alt-email"
            type="email"
            value={altEmail}
            onChange={(e) => setAltEmail(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <div className="border-t border-line pt-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-ink">
            Financial aid context (optional)
          </h3>
          <p className="text-xs text-ink-muted">
            Only used when scholarships evaluate need-based eligibility or ask for financial context.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="profile-income-tier" className="block text-xs font-medium text-ink-muted mb-1">
              Household income tier
            </label>
            <input
              id="profile-income-tier"
              type="text"
              placeholder="e.g. Low-income / Need-based"
              value={familyIncomeTier}
              onChange={(e) => setFamilyIncomeTier(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="profile-financial-statement" className="block text-xs font-medium text-ink-muted mb-1">
              Financial need statement
            </label>
            <textarea
              id="profile-financial-statement"
              rows={3}
              value={financialStatement}
              onChange={(e) => setFinancialStatement(e.target.value)}
              placeholder="Brief summary of financial circumstances if relevant to need-based awards..."
              className="w-full p-3 bg-canvas border border-line rounded-xl text-sm text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action transition-colors"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
