import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col justify-between py-10 px-4 sm:px-6 lg:px-8 selection:bg-slate-900 selection:text-white">
      {/* Top Nav Header */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified Student Environment</span>
        </div>
      </div>

      {/* Main Form Center Box */}
      <div className="w-full max-w-md mx-auto my-auto py-8">
        {children}
      </div>

      {/* Subtle Academic Footer */}
      <div className="w-full max-w-md mx-auto text-center text-xs text-slate-400">
        <p>Scholaris Assistant &copy; 2026 &bull; Strict Student Consent Enforced</p>
        <p className="mt-1 text-[11px] text-slate-400/80">
          Your credentials and profile data are protected with high-grade encryption.
        </p>
      </div>
    </div>
  );
}
