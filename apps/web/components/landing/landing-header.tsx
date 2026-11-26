'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Menu, X, ArrowRight } from 'lucide-react';

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '#verification', label: 'Verification' },
  { href: '#workspace', label: 'Workspace' },
  { href: '#faq', label: 'FAQ' },
];

export function LandingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-sm border-b border-line">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <span className="w-9 h-9 rounded-xl bg-pebble border border-line flex items-center justify-center text-ink">
            <GraduationCap className="w-5 h-5" />
          </span>
          <span className="text-lg font-bold tracking-tight text-ink">
            Scholaris
          </span>
        </Link>

        <nav aria-label="Landing navigation" className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="px-3.5 py-2 rounded-xl text-sm font-medium text-ink-muted hover:text-ink hover:bg-pebble/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href="/login"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl border border-line bg-surface hover:bg-pebble text-sm font-medium text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            Sign In
          </Link>
          <Link
            href="/applications"
            className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-action hover:bg-action-hover text-sm font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
          >
            Open Workspace
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileOpen}
          className="md:hidden w-10 h-10 rounded-xl border border-line flex items-center justify-center text-ink hover:bg-pebble transition-colors"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-line bg-surface px-4 py-4 space-y-3">
          <nav className="flex flex-col gap-1" aria-label="Mobile landing navigation">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 rounded-xl text-sm font-medium text-ink-muted hover:text-ink hover:bg-pebble"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="pt-2 border-t border-line flex flex-col gap-2">
            <Link
              href="/applications"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center h-11 px-4 rounded-xl bg-action hover:bg-action-hover text-sm font-medium text-white"
            >
              Open Workspace
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center justify-center h-11 px-4 rounded-xl border border-line bg-surface text-sm font-medium text-ink"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
