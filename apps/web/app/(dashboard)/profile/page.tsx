'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { LogIn, RefreshCw, CheckCircle2, Circle } from 'lucide-react';
import { api, FullProfileDTO } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { BasicProfileForm } from '@/components/profile/basic-profile-form';
import {
  EducationSection,
  LanguagesSection,
  AchievementsSection,
  ExperiencesSection,
} from '@/components/profile/records-manager';

type ProfileTab = 'personal' | 'education' | 'languages' | 'achievements' | 'experience';

const TABS: { key: ProfileTab; label: string }[] = [
  { key: 'personal', label: 'Personal Info' },
  { key: 'education', label: 'Education' },
  { key: 'languages', label: 'Languages' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'experience', label: 'Experience' },
];

function ProfileSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6" aria-busy="true">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-pebble rounded-lg animate-pulse" />
        <div className="h-4 w-80 max-w-full bg-pebble rounded-lg animate-pulse" />
      </div>
      <div className="h-24 bg-surface border border-line rounded-2xl p-5 space-y-3">
        <div className="h-4 w-40 bg-pebble rounded animate-pulse" />
        <div className="h-2 w-full bg-pebble rounded-full animate-pulse" />
      </div>
      <div className="h-80 bg-surface border border-line rounded-2xl p-6 space-y-4">
        <div className="h-5 w-48 bg-pebble rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-10 bg-pebble rounded-xl animate-pulse" />
          <div className="h-10 bg-pebble rounded-xl animate-pulse" />
          <div className="h-10 bg-pebble rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [data, setData] = useState<FullProfileDTO | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');

  const loadProfile = useCallback(async () => {
    try {
      setIsFetching(true);
      setErrorMessage(null);
      const res = await api.getFullProfile();
      setData(res);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Unable to load your profile.'
      );
    } finally {
      setIsFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadProfile();
    }
  }, [authLoading, isAuthenticated, loadProfile]);

  const readiness = useMemo(() => {
    if (!data) return { percent: 0, checks: [] as { label: string; done: boolean }[] };
    const p = data.profile;
    const checks = [
      {
        label: 'Personal details',
        done: Boolean(p?.firstName && p?.lastName && p?.nationality && p?.city),
      },
      { label: 'Education history', done: data.education.length > 0 },
      { label: 'Language skills', done: data.languages.length > 0 },
      {
        label: 'Experience or honors',
        done: data.experiences.length > 0 || data.achievements.length > 0,
      },
    ];
    const completed = checks.filter((c) => c.done).length;
    return {
      percent: Math.round((completed / checks.length) * 100),
      checks,
    };
  }, [data]);

  if (authLoading || (isAuthenticated && isFetching && !data && !errorMessage)) {
    return <ProfileSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-surface border border-line rounded-2xl p-8 shadow-card text-center space-y-4">
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Sign in to manage your student profile
          </h1>
          <p className="text-sm text-ink-muted leading-relaxed">
            Keep your academic history, test scores, and achievements verified in one place for instant eligibility matching and form auto-fill.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-action hover:bg-action-hover text-white text-sm font-medium transition-colors"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-line bg-surface hover:bg-pebble text-ink text-sm font-medium transition-colors"
            >
              Create Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink tracking-tight">
            Student Profile
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Structured academic and personal records used across eligibility checks and application drafts.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={loadProfile}
          disabled={isFetching}
          className="h-11 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {errorMessage && (
        <Alert variant="error" title="Could not load profile">
          {errorMessage}
        </Alert>
      )}

      {data && (
        <>
          {/* Profile Readiness Card */}
          <section className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-ink">
                Profile readiness
              </span>
              <span className="text-sm font-semibold text-ink tabular-nums">
                {readiness.percent}%
              </span>
            </div>
            <div className="h-2 w-full bg-pebble rounded-full overflow-hidden">
              <div
                className="h-full bg-action rounded-full transition-all duration-200"
                style={{ width: `${readiness.percent}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              {readiness.checks.map((item) => (
                <span
                  key={item.label}
                  className="inline-flex items-center gap-1.5 text-xs text-ink-muted"
                >
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-verified-text shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-ink-muted/50 shrink-0" />
                  )}
                  {item.label}
                </span>
              ))}
            </div>
          </section>

          {/* Section Tabs */}
          <div
            className="bg-surface border border-line rounded-2xl p-2 shadow-card flex flex-wrap gap-1"
            role="tablist"
            aria-label="Profile sections"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.key)}
                  className={`h-10 px-4 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                    active
                      ? 'bg-action-soft text-action'
                      : 'text-ink-muted hover:text-ink hover:bg-pebble'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'personal' && (
            <BasicProfileForm
              profile={data.profile}
              onSaved={(profile) => setData((prev) => (prev ? { ...prev, profile } : prev))}
            />
          )}

          {activeTab === 'education' && (
            <EducationSection
              items={data.education}
              onChange={(education) =>
                setData((prev) => (prev ? { ...prev, education } : prev))
              }
            />
          )}

          {activeTab === 'languages' && (
            <LanguagesSection
              items={data.languages}
              onChange={(languages) =>
                setData((prev) => (prev ? { ...prev, languages } : prev))
              }
            />
          )}

          {activeTab === 'achievements' && (
            <AchievementsSection
              items={data.achievements}
              onChange={(achievements) =>
                setData((prev) => (prev ? { ...prev, achievements } : prev))
              }
            />
          )}

          {activeTab === 'experience' && (
            <ExperiencesSection
              items={data.experiences}
              onChange={(experiences) =>
                setData((prev) => (prev ? { ...prev, experiences } : prev))
              }
            />
          )}
        </>
      )}
    </div>
  );
}
