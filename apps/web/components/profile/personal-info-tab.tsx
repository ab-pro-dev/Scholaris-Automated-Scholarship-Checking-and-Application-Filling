'use client';

import React, { useState } from 'react';
import { UserProfileDTO } from '@scholaris/types';
import { UpdateProfileInput, updateProfileSchema } from '@scholaris/validation';
import { api, ApiError } from '../../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert } from '../ui/alert';
import { Check, Save, User, Globe, DollarSign } from 'lucide-react';

interface PersonalInfoTabProps {
  profile: UserProfileDTO | null;
  onProfileUpdated: (updated: UserProfileDTO) => void;
}

export function PersonalInfoTab({ profile, onProfileUpdated }: PersonalInfoTabProps) {
  const [formData, setFormData] = useState<UpdateProfileInput>({
    firstName: profile?.firstName || '',
    middleName: profile?.middleName || '',
    lastName: profile?.lastName || '',
    dateOfBirth: profile?.dateOfBirth ? profile.dateOfBirth.slice(0, 10) : '',
    gender: profile?.gender || null,
    nationality: profile?.nationality || '',
    residenceCountry: profile?.residenceCountry || '',
    city: profile?.city || '',
    address: profile?.address || '',
    phone: profile?.phone || '',
    altEmail: profile?.altEmail || '',
    familyIncomeTier: profile?.familyIncomeTier || '',
    financialStatement: profile?.financialStatement || '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value === '' ? (name === 'gender' ? null : '') : value,
    }));
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Filter empty strings for optional fields
    const sanitized: UpdateProfileInput = {
      ...formData,
      dateOfBirth: formData.dateOfBirth ? formData.dateOfBirth : null,
      middleName: formData.middleName || null,
      address: formData.address || null,
      phone: formData.phone || null,
      altEmail: formData.altEmail || null,
      familyIncomeTier: formData.familyIncomeTier || null,
      financialStatement: formData.financialStatement || null,
    };

    const parsed = updateProfileSchema.safeParse(sanitized);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || 'Please check the form inputs.');
      return;
    }

    setIsLoading(true);
    try {
      const updated = await api.updateProfile(parsed.data);
      onProfileUpdated(updated);
      setSuccessMessage('Personal profile successfully updated!');
    } catch (err: any) {
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/90 shadow-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-slate-700" />
          Personal & Citizenship Information
        </CardTitle>
        <CardDescription>
          Your official identifying details required for cross-checking nationality and regional eligibility requirements.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="error" title="Update Failed">
              {error}
            </Alert>
          )}

          {successMessage && (
            <Alert variant="success" title="Success">
              {successMessage}
            </Alert>
          )}

          {/* Names */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="First Name"
              name="firstName"
              required
              value={formData.firstName || ''}
              onChange={handleChange}
            />
            <Input
              label="Middle Name (Optional)"
              name="middleName"
              value={formData.middleName || ''}
              onChange={handleChange}
            />
            <Input
              label="Last Name"
              name="lastName"
              required
              value={formData.lastName || ''}
              onChange={handleChange}
            />
          </div>

          {/* Date of Birth & Gender */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date of Birth (YYYY-MM-DD)"
              name="dateOfBirth"
              type="date"
              value={formData.dateOfBirth || ''}
              onChange={handleChange}
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
                Gender
              </label>
              <select
                name="gender"
                value={formData.gender || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
              >
                <option value="">Select gender (optional)</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Geographic Details */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />
              Nationality & Location
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Nationality / Citizenship"
                name="nationality"
                required
                placeholder="e.g. Ethiopian, Kenyan, Nigerian"
                value={formData.nationality || ''}
                onChange={handleChange}
              />
              <Input
                label="Residence Country"
                name="residenceCountry"
                required
                placeholder="e.g. Ethiopia"
                value={formData.residenceCountry || ''}
                onChange={handleChange}
              />
              <Input
                label="Current City"
                name="city"
                required
                placeholder="e.g. Addis Ababa"
                value={formData.city || ''}
                onChange={handleChange}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Input
                label="Residential Address"
                name="address"
                placeholder="Street address or P.O. Box"
                value={formData.address || ''}
                onChange={handleChange}
              />
              <Input
                label="Phone Number"
                name="phone"
                type="tel"
                placeholder="+251 911 234 567"
                value={formData.phone || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Financial Background */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Need-Based Financial Statement (Optional)
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Family Income Tier"
                  name="familyIncomeTier"
                  placeholder="e.g. Low-Income / Tier 1 (< $2,500/yr)"
                  value={formData.familyIncomeTier || ''}
                  onChange={handleChange}
                />
                <Input
                  label="Alternative Contact Email"
                  name="altEmail"
                  type="email"
                  placeholder="secondary.email@domain.com"
                  value={formData.altEmail || ''}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 tracking-wide uppercase">
                  Financial Circumstances Summary
                </label>
                <textarea
                  name="financialStatement"
                  rows={3}
                  placeholder="Describe any financial hardships or need-based criteria relevant for need-based scholarships..."
                  value={formData.financialStatement || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-colors"
                />
              </div>
            </div>
          </div>
        </CardContent>

        <CardFooter className="justify-end gap-3">
          <Button
            type="submit"
            isLoading={isLoading}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
