'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../context/auth-context';
import { GraduationCap, User, Search, FileText, LogOut, Loader2, ShieldCheck, FolderLock } from 'lucide-react';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-slate-800 animate-spin" />
        <p className="text-xs text-slate-500 font-medium">Loading Scholaris environment...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navLinks = [
    { href: '/profile', label: 'Academic Profile', icon: <User className="w-4 h-4" /> },
    { href: '/documents', label: 'Document Vault', icon: <FolderLock className="w-4 h-4" /> },
    { href: '/scholarships', label: 'Scholarship Verifier', icon: <ShieldCheck className="w-4 h-4" /> },
    { href: '/applications', label: 'My Applications', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col selection:bg-slate-900 selection:text-white">
      {/* Top Academic Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-6">
            <Link href="/profile" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-white shadow-xs group-hover:bg-slate-800 transition-colors">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-serif font-bold text-base text-slate-900 tracking-tight">
                    Scholaris
                  </span>
                  <Badge variant="verified" size="sm">
                    Verified
                  </Badge>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                  Assistant &bull; Portal
                </span>
              </div>
            </Link>

            {/* Main Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action: Student Session Card & Sign Out */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {profile?.fullName || user?.email}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {user?.email}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              leftIcon={<LogOut className="w-3.5 h-3.5" />}
              className="text-slate-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50/50"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict User Consent Active &bull; Zero automated submissions without user approval</span>
          </div>
          <p>&copy; 2026 Scholaris Academic Engine. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
