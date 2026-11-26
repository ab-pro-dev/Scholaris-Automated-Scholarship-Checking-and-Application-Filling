import React from 'react';
import Link from 'next/link';
import { GraduationCap, ShieldCheck } from 'lucide-react';

export function LandingFooter() {
  return (
    <footer className="bg-surface border-t border-line mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-pebble border border-line flex items-center justify-center text-ink">
                <GraduationCap className="w-5 h-5" />
              </span>
              <span className="text-lg font-bold tracking-tight text-ink">
                Scholaris
              </span>
            </Link>
            <p className="text-sm text-ink-muted leading-relaxed max-w-sm">
              An intelligent scholarship verification and application workspace built to protect students from unverified links while keeping every final submission under explicit human control.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-medium text-verified-text bg-verified-bg border border-verified-border px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Human authorization required before every submission</span>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
              Workspace
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/applications" className="text-ink-muted hover:text-action transition-colors">
                  Applications
                </Link>
              </li>
              <li>
                <Link href="/scholarships" className="text-ink-muted hover:text-action transition-colors">
                  Scholarships
                </Link>
              </li>
              <li>
                <Link href="/profile" className="text-ink-muted hover:text-action transition-colors">
                  Student Profile
                </Link>
              </li>
              <li>
                <Link href="/documents" className="text-ink-muted hover:text-action transition-colors">
                  Document Vault
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-2 space-y-3">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a href="#how-it-works" className="text-ink-muted hover:text-action transition-colors">
                  How it works
                </a>
              </li>
              <li>
                <a href="#verification" className="text-ink-muted hover:text-action transition-colors">
                  Link Verification
                </a>
              </li>
              <li>
                <a href="#workspace" className="text-ink-muted hover:text-action transition-colors">
                  Core Modules
                </a>
              </li>
              <li>
                <a href="#faq" className="text-ink-muted hover:text-action transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
              Account &amp; Governance
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/login" className="text-ink-muted hover:text-action transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-ink-muted hover:text-action transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link href="/admin" className="text-ink-muted hover:text-action transition-colors">
                  System Monitoring
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-line flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-ink-muted">
          <p>&copy; {new Date().getFullYear()} Scholaris. Built for transparent scholarship applications.</p>
          <p>SSRF-protected inspection &middot; Encrypted document vault &middot; Explicit consent gate</p>
        </div>
      </div>
    </footer>
  );
}
