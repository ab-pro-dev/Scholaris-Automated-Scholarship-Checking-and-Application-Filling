'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, Clock, Lock, ArrowRight } from 'lucide-react';
import { ApplicationDashboardItemDTO } from '@scholaris/types';
import { Badge } from '@/components/ui/badge';

interface DeadlinesWidgetProps {
  applications: ApplicationDashboardItemDTO[];
}

export function DeadlinesWidget({ applications }: DeadlinesWidgetProps) {
  const now = new Date();

  const upcoming = applications
    .filter((app) => app.status !== 'SUBMITTED' && app.scholarship.deadline)
    .map((app) => {
      const deadlineDate = new Date(app.scholarship.deadline!);
      const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { app, deadlineDate, daysLeft };
    })
    .filter((item) => item.daysLeft >= -1)
    .sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Upcoming Deadlines Card */}
      <section
        aria-labelledby="upcoming-deadlines-heading"
        className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-line/70">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-ink-muted" aria-hidden="true" />
            <h2 id="upcoming-deadlines-heading" className="text-sm font-semibold text-ink">
              Upcoming Deadlines
            </h2>
          </div>
          <span className="text-xs font-medium text-ink-muted tabular-nums">
            {upcoming.length} active
          </span>
        </div>

        {upcoming.length === 0 ? (
          <div className="py-5 text-center space-y-1.5">
            <Clock className="w-5 h-5 text-ink-muted mx-auto" aria-hidden="true" />
            <p className="text-xs font-semibold text-ink">No imminent deadlines</p>
            <p className="text-xs text-ink-muted">
              Pending applications are either submitted or have rolling dates.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(({ app, deadlineDate, daysLeft }) => {
              const isUrgent = daysLeft <= 7;
              const targetHref =
                app.status === 'READY_FOR_REVIEW' || app.status === 'AWAITING_APPROVAL'
                  ? `/applications/${app.id}/review`
                  : `/applications/${app.id}`;

              return (
                <li key={app.id}>
                  <Link
                    href={targetHref}
                    className="group flex items-start justify-between gap-3 p-2.5 -mx-2.5 rounded-xl hover:bg-canvas transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-ink truncate group-hover:text-action transition-colors">
                        {app.scholarship.title}
                      </p>
                      <p className="text-[11px] text-ink-muted truncate">
                        {deadlineDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        · {app.scholarship.providerName}
                      </p>
                    </div>

                    <Badge
                      variant={isUrgent ? 'warning' : 'neutral'}
                      className="shrink-0 text-[11px] px-2 py-0.5 tabular-nums"
                    >
                      {daysLeft <= 0 ? 'Due today' : `${daysLeft}d`}
                    </Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Mandatory Submission Rule & New Verification CTA */}
      <section className="bg-surface border border-line rounded-2xl p-5 shadow-card space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-verified-text">
          <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Mandatory Submission Rule</span>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          Scholaris never clicks final submit without your explicit electronic consent signature.
        </p>
        <Link
          href="/scholarships"
          className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2.5 bg-action text-white rounded-xl text-xs font-semibold hover:bg-action-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span>Check New Scholarship URL</span>
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </section>
    </div>
  );
}
