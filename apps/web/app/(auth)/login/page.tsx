'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/alert';
import { loginSchema } from '@scholaris/validation';
import { GraduationCap, Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate using Zod schema
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message || 'Invalid email or password');
      return;
    }

    setIsLoading(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      setFormError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-slate-200/90 shadow-sm">
      <CardHeader className="text-center pb-2 pt-6">
        <div className="w-12 h-12 bg-slate-900 rounded-xl mx-auto flex items-center justify-center text-white mb-3 shadow-xs">
          <GraduationCap className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 font-serif">
          Sign In to Scholaris
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Access your verified scholarships, eligibility assessments, and academic profile.
        </p>
      </CardHeader>

      <CardContent className="pt-4">
        {formError && (
          <div className="mb-4">
            <Alert variant="error" title="Authentication Error">
              {formError}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="student@university.edu"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
              />
              <span>Remember me</span>
            </label>
            <span className="text-slate-400 cursor-not-allowed hover:underline">
              Forgot password?
            </span>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            size="md"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Sign In
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>Don&apos;t have an account yet? </span>
          <Link
            href="/register"
            className="font-semibold text-slate-900 hover:underline inline-flex items-center gap-0.5 ml-1"
          >
            Create student profile &rarr;
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
