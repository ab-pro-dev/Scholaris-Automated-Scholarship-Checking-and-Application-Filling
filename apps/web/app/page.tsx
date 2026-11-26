import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FileText,
  UserCheck,
  FolderLock,
  Sparkles,
  Globe,
  Lock,
} from 'lucide-react';
import { LandingHeader } from '@/components/landing/landing-header';
import { LandingFooter } from '@/components/landing/landing-footer';
import { FaqSection } from '@/components/landing/faq-section';

const WORKFLOW_STEPS = [
  {
    step: '01',
    title: 'Paste & verify any scholarship link',
    description:
      'Inspect external scholarship URLs with SSRF protection, domain checks, and scam-flag detection before investing hours in an application.',
  },
  {
    step: '02',
    title: 'Match requirements to your profile',
    description:
      'Extract GPA, degree level, nationality, and language criteria automatically and see a transparent criterion-by-criterion match breakdown.',
  },
  {
    step: '03',
    title: 'Prepare answers & attach documents',
    description:
      'Map structured profile fields, attach OCR-indexed transcripts or CVs from your vault, and refine AI-assisted essay drafts in your own voice.',
  },
  {
    step: '04',
    title: 'Review & explicitly authorize',
    description:
      'Inspect every mapped field side by side on the pre-submission screen. Nothing is ever sent without your checkbox consent and signature.',
  },
];

const WORKSPACE_MODULES = [
  {
    href: '/scholarships',
    icon: Globe,
    title: 'Scholarship Discovery & Verification',
    description:
      'Analyze links, inspect domain trust scores, extract structured criteria, and check personal eligibility.',
    cta: 'Explore Scholarships',
  },
  {
    href: '/profile',
    icon: UserCheck,
    title: 'Structured Student Profile',
    description:
      'Maintain your education history, standardized language scores, honors, and research experience in one reusable record.',
    cta: 'Manage Profile',
  },
  {
    href: '/documents',
    icon: FolderLock,
    title: 'Private Document Vault & OCR',
    description:
      'Upload transcripts, CVs, and score reports once with automatic text extraction for instant reuse.',
    cta: 'Open Vault',
  },
  {
    href: '/applications',
    icon: FileText,
    title: 'Application Workspace & Review Gate',
    description:
      'Track deadlines, resolve missing prompts, edit mapped fields, and authorize final submissions safely.',
    cta: 'View Applications',
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <LandingHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-tight">
                Verify every scholarship. Apply with complete control.
              </h1>
              <p className="text-base sm:text-lg text-ink-muted leading-relaxed max-w-2xl">
                Scholaris checks external scholarship links for authenticity, matches eligibility criteria against your verified academic profile, prepares form answers and essays, and waits for your explicit sign-off before submitting anything.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/applications"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-xl bg-action hover:bg-action-hover text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
                >
                  Open Student Workspace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                <Link
                  href="/scholarships"
                  className="inline-flex items-center justify-center h-12 px-6 rounded-xl border border-line bg-surface hover:bg-pebble text-ink text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  Verify a Scholarship Link
                </Link>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-ink-muted">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-verified-text" />
                  SSRF-protected link inspection
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-verified-text" />
                  Criterion-level eligibility match
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-verified-text" />
                  Mandatory student authorization gate
                </span>
              </div>
            </div>

            {/* Warm Product Snapshot Card */}
            <div className="lg:col-span-5">
              <div className="bg-surface border border-line rounded-2xl p-6 shadow-elevated space-y-5">
                <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
                  <div>
                    <h2 className="text-base font-semibold text-ink">
                      Chevening Global Master&apos;s Fellowship
                    </h2>
                    <p className="text-xs text-ink-muted mt-0.5">
                      UK Foreign, Commonwealth &amp; Development Office
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-verified-bg text-verified-text border border-verified-border tabular-nums shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verified 96%
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between bg-canvas border border-line rounded-xl px-3.5 py-2.5">
                    <span className="text-ink-muted">Domain &amp; TLS identity</span>
                    <span className="font-medium text-verified-text">Matched</span>
                  </div>
                  <div className="flex items-center justify-between bg-canvas border border-line rounded-xl px-3.5 py-2.5">
                    <span className="text-ink-muted">Eligibility criteria (3/3)</span>
                    <span className="font-medium text-verified-text">Eligible · 94%</span>
                  </div>
                  <div className="flex items-center justify-between bg-canvas border border-line rounded-xl px-3.5 py-2.5">
                    <span className="text-ink-muted">Form fields &amp; transcript</span>
                    <span className="font-medium text-ink tabular-nums">100% mapped</span>
                  </div>
                </div>

                <div className="bg-warning-bg border border-warning-border rounded-xl p-3.5 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-warning-text shrink-0 mt-0.5" />
                  <div className="text-xs space-y-0.5">
                    <p className="font-semibold text-warning-text">
                      Awaiting Student Authorization
                    </p>
                    <p className="text-warning-text/90">
                      Review all mapped fields and sign to unlock final submission.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="border-t border-line bg-surface py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                From unverified link to confident submission
              </h2>
              <p className="text-sm sm:text-base text-ink-muted">
                Every stage separates automated preparation from human decision-making so you stay informed at every step.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {WORKFLOW_STEPS.map((item) => (
                <article
                  key={item.step}
                  className="bg-canvas border border-line rounded-2xl p-5 space-y-3"
                >
                  <span className="inline-block font-mono text-xs font-semibold text-ink-muted bg-pebble px-2.5 py-1 rounded-lg tabular-nums">
                    {item.step}
                  </span>
                  <h3 className="text-base font-semibold text-ink leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Verification & Safety Deep Dive */}
        <section id="verification" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-6 bg-surface border border-line rounded-2xl p-6 sm:p-8 shadow-card space-y-4">
              <div className="w-10 h-10 rounded-xl bg-verified-bg border border-verified-border flex items-center justify-center text-verified-text">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                Built-in protection against fake or predatory portals
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                Before any page content is parsed, Scholaris validates hostnames against private-network SSRF rules, checks institutional domain alignment, and flags suspicious application-fee or credential-harvesting patterns.
              </p>
              <ul className="space-y-2 text-sm text-ink pt-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified-text shrink-0 mt-0.5" />
                  <span>Transparent verification score and source domain evidence</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified-text shrink-0 mt-0.5" />
                  <span>Submissions automatically blocked on suspicious scholarships</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified-text shrink-0 mt-0.5" />
                  <span>Safe human handoff whenever a portal presents CAPTCHA or 2FA</span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-6 bg-surface border border-line rounded-2xl p-6 sm:p-8 shadow-card space-y-4">
              <div className="w-10 h-10 rounded-xl bg-pebble border border-line flex items-center justify-center text-ink">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
                Your data, your voice, your final signature
              </h2>
              <p className="text-sm text-ink-muted leading-relaxed">
                AI drafts never fabricate achievements or submit forms behind your back. Every mapped field shows whether it came from your profile, an uploaded transcript, manual input, or an editable AI draft.
              </p>
              <ul className="space-y-2 text-sm text-ink pt-2">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified-text shrink-0 mt-0.5" />
                  <span>Source provenance and confidence badge on every mapped field</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified-text shrink-0 mt-0.5" />
                  <span>Encrypted vault for transcripts, CVs, and score reports</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-verified-text shrink-0 mt-0.5" />
                  <span>Two-step digital consent + signature required before submission</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Workspace Modules */}
        <section id="workspace" className="border-t border-line bg-surface py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="max-w-2xl space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                Everything in one calm desk
              </h2>
              <p className="text-sm sm:text-base text-ink-muted">
                Jump straight into any part of your scholarship workflow.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {WORKSPACE_MODULES.map((mod) => {
                const Icon = mod.icon;
                return (
                  <div
                    key={mod.href}
                    className="bg-canvas border border-line rounded-2xl p-6 flex flex-col justify-between gap-5"
                  >
                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center text-ink">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="text-lg font-semibold text-ink">
                        {mod.title}
                      </h3>
                      <p className="text-sm text-ink-muted leading-relaxed">
                        {mod.description}
                      </p>
                    </div>
                    <div>
                      <Link
                        href={mod.href}
                        className="inline-flex items-center text-sm font-semibold text-action hover:text-action-hover transition-colors"
                      >
                        {mod.cta}
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <FaqSection />

        {/* Closing CTA Band */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-pebble border border-line rounded-2xl p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
                Ready to inspect your next scholarship?
              </h2>
              <p className="text-sm sm:text-base text-ink-muted">
                Open the workspace to verify a scholarship link, update your academic profile, or review an application in progress.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/scholarships"
                className="inline-flex items-center justify-center h-11 px-5 rounded-xl border border-line bg-surface hover:bg-canvas text-sm font-semibold text-ink transition-colors"
              >
                Explore Scholarships
              </Link>
              <Link
                href="/applications"
                className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-action hover:bg-action-hover text-sm font-semibold text-white transition-colors"
              >
                Open Applications
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
