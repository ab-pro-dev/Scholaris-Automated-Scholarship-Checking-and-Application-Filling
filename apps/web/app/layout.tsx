import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scholaris — Intelligent Scholarship Verification & Application Assistant',
  description:
    'Save your profile once. Verify legitimate scholarship opportunities, evaluate eligibility, and automate form filling with strict human approval.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-canvas text-slate-900 selection:bg-slate-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
