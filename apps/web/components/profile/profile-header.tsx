'use client';

import React from 'react';
import { UserProfileDTO } from '@scholaris/types';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import {
  GraduationCap,
  MapPin,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface ProfileHeaderProps {
  profile: UserProfileDTO | null;
  email?: string;
  educationCount: number;
  languagesCount: number;
  achievementsCount: number;
  experiencesCount: number;
}

export function ProfileHeader({
  profile,
  email,
  educationCount,
  languagesCount,
  achievementsCount,
  experiencesCount,
}: ProfileHeaderProps) {
  // Compute profile readiness score for automated matching
  let score = 20; // Base registered account
  if (profile?.nationality && profile.nationality !== 'Unknown') score += 15;
  if (profile?.city && profile?.phone) score += 15;
  if (educationCount > 0) score += 20;
  if (languagesCount > 0) score += 10;
  if (achievementsCount > 0) score += 10;
  if (experiencesCount > 0) score += 10;

  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'ST';

  return (
    <Card className="border-slate-200/90 shadow-xs overflow-hidden mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Avatar & Identity Details */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-900 to-slate-700 text-white flex items-center justify-center font-serif text-xl font-bold tracking-tight shadow-sm shrink-0 border border-slate-700">
              {initials}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold font-serif text-slate-900 tracking-tight">
                  {profile?.fullName || 'Student Scholar'}
                </h1>
                <Badge variant="navy" size="sm">
                  Verified Student
                </Badge>
                {profile?.nationality && profile.nationality !== 'Unknown' && (
                  <Badge variant="neutral" size="sm">
                    {profile.nationality}
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                {email && (
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {email}
                  </span>
                )}
                {profile?.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {profile.city}
                    {profile.residenceCountry ? `, ${profile.residenceCountry}` : ''}
                  </span>
                )}
                {profile?.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {profile.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Scholarship Readiness Progress Gauge */}
          <div className="lg:w-72 bg-slate-50/80 border border-slate-200/70 p-4 rounded-xl flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Application Readiness
              </span>
              <span className="font-mono font-bold text-slate-900 tabular-nums">
                {score}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  score >= 80 ? 'bg-emerald-600' : score >= 50 ? 'bg-amber-500' : 'bg-slate-700'
                }`}
                style={{ width: `${score}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
              <span className="flex items-center gap-1">
                {score >= 80 ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    <span>Ready for AI Matching</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                    <span>Complete sections below</span>
                  </>
                )}
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                {educationCount} edu &bull; {languagesCount} lang
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
