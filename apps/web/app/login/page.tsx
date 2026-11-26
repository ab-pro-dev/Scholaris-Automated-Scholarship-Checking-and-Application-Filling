'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      router.push('/applications');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to sign in');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-surface border border-line rounded-2xl p-7 shadow-card space-y-6">
        <div className="space-y-2 text-center">
          <div className="w-11 h-11 rounded-xl bg-pebble border border-line flex items-center justify-center mx-auto text-ink">
            <GraduationCap className="w-5 h-5" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-bold text-ink tracking-tight">Sign in to Scholaris</h1>
          <p className="text-xs text-ink-muted">
            Continue reviewing applications and upcoming scholarship deadlines.
          </p>
        </div>

        {error && (
          <Alert variant="error" title="Sign-in Error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="login-email" className="block text-xs font-semibold text-ink">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              className="w-full px-3.5 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="block text-xs font-semibold text-ink">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-3.5 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            <span>Sign In</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
          </Button>
        </form>

        <p className="text-center text-xs text-ink-muted">
          New to Scholaris?{' '}
          <Link
            href="/register"
            className="font-semibold text-action hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action rounded"
          >
            Create Student Account
          </Link>
        </p>
      </div>
    </div>
  );
}
