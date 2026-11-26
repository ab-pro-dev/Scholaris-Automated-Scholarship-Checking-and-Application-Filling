'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
      router.push('/applications');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
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
          <h1 className="text-xl font-bold text-ink tracking-tight">Create Student Account</h1>
          <p className="text-xs text-ink-muted">
            Verify authentic scholarships and manage applications with explicit consent.
          </p>
        </div>

        {error && (
          <Alert variant="error" title="Registration Error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="reg-first" className="block text-xs font-semibold text-ink">
                First Name
              </label>
              <input
                id="reg-first"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Amina"
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-last" className="block text-xs font-semibold text-ink">
                Last Name
              </label>
              <input
                id="reg-last"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Hassan"
                className="w-full px-3.5 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reg-email" className="block text-xs font-semibold text-ink">
              Email Address
            </label>
            <input
              id="reg-email"
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
            <label htmlFor="reg-password" className="block text-xs font-semibold text-ink">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full px-3.5 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-action focus:border-action"
            />
          </div>

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            <span>Create Account</span>
            {!isSubmitting && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
          </Button>
        </form>

        <p className="text-center text-xs text-ink-muted">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-semibold text-action hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action rounded"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
