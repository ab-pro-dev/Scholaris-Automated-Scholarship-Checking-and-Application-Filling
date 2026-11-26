'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  GraduationCap,
  FileText,
  ShieldCheck,
  User,
  FolderLock,
  Activity,
  LogOut,
  LogIn,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { cn } from '@/lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      href: '/applications',
      label: 'Applications',
      icon: <FileText className="w-4 h-4" aria-hidden="true" />,
    },
    {
      href: '/scholarships',
      label: 'Scholarships',
      icon: <ShieldCheck className="w-4 h-4" aria-hidden="true" />,
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: <User className="w-4 h-4" aria-hidden="true" />,
    },
    {
      href: '/documents',
      label: 'Documents',
      icon: <FolderLock className="w-4 h-4" aria-hidden="true" />,
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            href: '/admin',
            label: 'Admin',
            icon: <Activity className="w-4 h-4" aria-hidden="true" />,
          },
        ]
      : []),
  ];

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const displayName =
    profile?.firstName && profile?.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : user?.email || 'Student';

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {/* Desktop & Tablet Top Navigation */}
      <header className="sticky top-0 z-40 bg-surface border-b border-line">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <span className="w-9 h-9 rounded-xl bg-pebble border border-line flex items-center justify-center text-ink">
                <GraduationCap className="w-5 h-5" aria-hidden="true" />
              </span>
              <span className="text-lg font-bold tracking-tight text-ink">Scholaris</span>
            </Link>

            <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      isActive
                        ? 'bg-action-soft text-action font-semibold'
                        : 'text-ink-muted hover:text-ink hover:bg-pebble/60'
                    )}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="h-8 w-28 rounded-lg bg-pebble animate-pulse" aria-hidden="true" />
            ) : isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-xs font-medium text-ink-muted truncate max-w-[180px]">
                  {displayName}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-surface text-xs font-semibold text-ink-muted hover:text-ink hover:bg-pebble/60 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Sign out</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-action text-white text-xs font-semibold hover:bg-action-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-offset-2"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 pb-24 md:pb-12">{children}</main>

      {/* Mobile Persistent Bottom Navigation */}
      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-line px-2 py-1.5"
      >
        <div className="grid grid-cols-4 gap-1">
          {navItems.slice(0, 4).map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[11px] font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action',
                  isActive ? 'text-action font-semibold bg-action-soft/70' : 'text-ink-muted'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
