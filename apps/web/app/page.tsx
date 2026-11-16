import Link from 'next/link';
import {
  ShieldCheck,
  FileCheck2,
  Lock,
  ArrowRight,
  ExternalLink,
  GraduationCap,
  Sparkles,
  Check,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Scholaris
            </span>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="#how-it-works"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              How It Works
            </Link>
            <Link
              href="#verification"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Authenticity Engine
            </Link>
            <Link
              href="#security"
              className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Security Guarantee
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-slate-800"
            >
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="mx-auto max-w-5xl px-6 pt-20 pb-16 text-center md:pt-28 md:pb-20">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-6xl">
            Apply to authentic scholarships without repetitive paperwork.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 md:text-xl">
            Store your academic credentials once. Scholaris verifies legitimate university opportunities,
            checks your eligibility, and prepares complex portal applications—submitting only when you explicitly approve.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-7 text-base font-semibold text-white shadow-sm transition-all hover:bg-slate-800 sm:w-auto"
            >
              <span>Build Your Student Profile</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="flex h-12 w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-7 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              See How It Works
            </Link>
          </div>
        </section>

        {/* Live Interface Preview / Artifact Simulation */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* Window bar */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-slate-300" />
                <div className="h-3 w-3 rounded-full bg-slate-300" />
                <div className="h-3 w-3 rounded-full bg-slate-300" />
                <span className="ml-2 text-xs font-medium text-slate-500">
                  scholaris.app/applications/stipendium-hungaricum
                </span>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                VERIFIED INSTITUTION
              </span>
            </div>

            {/* Dashboard Content Mockup */}
            <div className="p-6 md:p-8">
              <div className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-6 md:flex-row md:items-center">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    Stipendium Hungaricum Scholarship Programme 2026
                  </h3>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <span>Tempus Public Foundation &middot; Budapest, Hungary</span>
                    <span>&middot;</span>
                    <a
                      href="https://stipendiumhungaricum.hu"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-700 underline hover:text-slate-900"
                    >
                      Official Portal <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-xs uppercase tracking-wider text-slate-400">
                      Application Deadline
                    </span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      Jan 15, 2026
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Preparation & Safety Guard Preview */}
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Eligibility Status
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-700">
                      Eligible
                    </span>
                    <span className="text-xs text-slate-500">4 / 4 satisfied</span>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-slate-600">
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Nationality: Eligible Partner Country</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Minimum GPA: 3.50+ (Profile: 3.75)</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Language: English C1 Certified</span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 p-5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Field Mapping
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      24 Fields
                    </span>
                    <span className="text-xs text-slate-500">100% mapped</span>
                  </div>
                  <div className="mt-3 space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Legal Name</span>
                      <span className="font-medium text-slate-900">Profile Vault</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-1">
                      <span className="text-slate-500">Transcripts</span>
                      <span className="font-medium text-slate-900">Official_Transcript.pdf</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Statement</span>
                      <span className="font-medium text-slate-900">Student Approved</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
                  <div className="flex items-center gap-1.5 text-amber-800">
                    <Lock className="h-4 w-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">
                      Human Authorization Gate
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-700 leading-relaxed">
                    Browser automation has prepared the application in draft mode. Submission is strictly locked until you review all filled values.
                  </p>
                  <button
                    type="button"
                    className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-center text-xs font-semibold text-white transition-colors hover:bg-slate-800"
                  >
                    Inspect & Authorize Submission
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* The 3 Core Pillars */}
        <section id="how-it-works" className="border-t border-slate-200 bg-white py-20">
          <div className="mx-auto max-w-5xl px-6">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Built on academic trust and complete user control.
            </h2>
            <p className="mt-3 max-w-xl text-slate-600">
              Unlike generic bots that blindly fill forms, Scholaris operates with strict safety boundaries and institutional verification.
            </p>

            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                  <FileCheck2 className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Single Credential Vault
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Enter your education records, language test scores, honors, and documents once. Securely encrypted and ready for multiple scholarship applications.
                </p>
              </div>

              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Independent Scam Defense
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  Every submitted link undergoes institutional domain verification and scam detection before any data is filled. Suspicious opportunities are blocked immediately.
                </p>
              </div>

              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-900">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  Mandatory Submission Approval
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  The AI never submits on your behalf automatically. You review every filled input, statement, and attached file before authorizing the final submission.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-slate-700" />
            <span className="font-semibold text-slate-900">Scholaris</span>
            <span className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600">
            <Link href="#privacy" className="hover:text-slate-900">
              Privacy Standards
            </Link>
            <Link href="#terms" className="hover:text-slate-900">
              Terms of Service
            </Link>
            <Link href="#security" className="hover:text-slate-900">
              Security Architecture
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
