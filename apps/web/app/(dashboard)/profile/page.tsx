'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../context/auth-context';
import { api, FullProfileData } from '../../../lib/api';
import {
  UserProfileDTO,
  EducationRecordDTO,
  LanguageSkillDTO,
  AchievementDTO,
  ExperienceDTO,
} from '@scholaris/types';
import { ProfileHeader } from '../../../components/profile/profile-header';
import { PersonalInfoTab } from '../../../components/profile/personal-info-tab';
import { EducationTab } from '../../../components/profile/education-tab';
import { LanguagesTab } from '../../../components/profile/languages-tab';
import { AchievementsTab } from '../../../components/profile/achievements-tab';
import { ExperiencesTab } from '../../../components/profile/experiences-tab';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/ui/tabs';
import { Alert } from '../../../components/ui/alert';
import {
  User,
  GraduationCap,
  Languages,
  Trophy,
  Briefcase,
  Loader2,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, profile: authProfile, updateProfileState } = useAuth();
  const [profile, setProfile] = useState<UserProfileDTO | null>(authProfile);
  const [education, setEducation] = useState<EducationRecordDTO[]>([]);
  const [languages, setLanguages] = useState<LanguageSkillDTO[]>([]);
  const [achievements, setAchievements] = useState<AchievementDTO[]>([]);
  const [experiences, setExperiences] = useState<ExperienceDTO[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadFullProfile = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const data: FullProfileData = await api.getFullProfile();
      if (data.profile) {
        setProfile(data.profile);
        updateProfileState(data.profile);
      }
      setEducation(data.education || []);
      setLanguages(data.languages || []);
      setAchievements(data.achievements || []);
      setExperiences(data.experiences || []);
    } catch (err: any) {
      setFetchError(err.message || 'Unable to load profile data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFullProfile();
  }, []);

  const handleProfileUpdated = (updated: UserProfileDTO) => {
    setProfile(updated);
    updateProfileState(updated);
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
        <p className="text-xs font-medium text-slate-500">Retrieving student academic portfolio...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {fetchError && (
        <Alert variant="error" title="Sync Error">
          {fetchError}
        </Alert>
      )}

      {/* Profile Overview Header with Application Readiness Gauge */}
      <ProfileHeader
        profile={profile}
        email={user?.email}
        educationCount={education.length}
        languagesCount={languages.length}
        achievementsCount={achievements.length}
        experiencesCount={experiences.length}
      />

      {/* Main Tabbed Portfolio Sections */}
      <Tabs defaultValue="personal" className="space-y-6">
        <TabsList className="w-full justify-start overflow-x-auto p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-xl">
          <TabsTrigger value="personal" icon={<User className="w-4 h-4" />}>
            Personal & Citizenship
          </TabsTrigger>

          <TabsTrigger value="education" icon={<GraduationCap className="w-4 h-4" />}>
            Education History
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200/80 text-slate-800">
              {education.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="languages" icon={<Languages className="w-4 h-4" />}>
            Languages
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200/80 text-slate-800">
              {languages.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="achievements" icon={<Trophy className="w-4 h-4" />}>
            Honors & Awards
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200/80 text-slate-800">
              {achievements.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="experience" icon={<Briefcase className="w-4 h-4" />}>
            Experience
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-slate-200/80 text-slate-800">
              {experiences.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoTab
            profile={profile}
            onProfileUpdated={handleProfileUpdated}
          />
        </TabsContent>

        <TabsContent value="education">
          <EducationTab
            records={education}
            onRecordsUpdated={setEducation}
          />
        </TabsContent>

        <TabsContent value="languages">
          <LanguagesTab
            records={languages}
            onRecordsUpdated={setLanguages}
          />
        </TabsContent>

        <TabsContent value="achievements">
          <AchievementsTab
            records={achievements}
            onRecordsUpdated={setAchievements}
          />
        </TabsContent>

        <TabsContent value="experience">
          <ExperiencesTab
            records={experiences}
            onRecordsUpdated={setExperiences}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
