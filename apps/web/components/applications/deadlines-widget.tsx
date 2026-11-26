'use client';

import React from 'react';
import Link from 'next/link';
import { Calendar, ArrowRight, Clock, ShieldCheck } from 'lucide-react';
import { ApplicationDashboardItemDTO } from '@scholaris/types';

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
      return {
        app,
        deadlineDate,
        daysLeft,
      };
    })
    .filter((item) => item.daysLeft >= -1)
    .sort((a, b) => a.deadlineDate.getTime() - b.deadlineDate.getTime())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Upcoming Deadlines Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-700" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-900">Upcoming Deadlines</h2>
          </div>
          <span className="text-xs font-medium text-slate-500 tabular-nums">
            {upcoming.length} active
          </span>
        </div>

        {upcoming.length === 0 ? (
          <div className="py-4 text-center space-y-1.5">
            <Clock className="w-5 h-5 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-xs font-medium text-slate-700">No imminent deadlines</p>
            <p className="text-xs text-slate-500">
              All pending applications are either submitted or have rolling dates.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
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
                    className="group flex items-start justify-between gap-3 p-2.5 -mx-2.5 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                        {app.scholarship.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {deadlineDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}{' '}
                        · {app.scholarship.providerName}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold tabular-nums border ${
                        isUrgent
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {daysLeft <= 0 ? 'Due today' : `${daysLeft}d`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Quick Action Card */}
      <div className="bg-slate-900 text-white rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          Human-Controlled Automation
        </div>
        <h3 className="text-sm font-semibold text-white">
          Found another scholarship opportunity?
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Paste any official scholarship link into the verifier to check authenticity, evaluate your eligibility, and auto-fill the form.
        </p>
        <Link
          href="/scholarships"
          className="inline-flex items-center justify-center gap-1.5 w-full px-4 py-2 bg-white text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Verify New Scholarship
          <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
