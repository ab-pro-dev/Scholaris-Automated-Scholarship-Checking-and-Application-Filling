'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { Alert } from '../../../components/ui/alert';
import { registerSchema } from '@scholaris/validation';
import { GraduationCap, Eye, EyeOff, Lock, Mail, User, Check, ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Password rules validation for live visual checklist
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate using isomorphic Zod schema
    const validation = registerSchema.safeParse({
      firstName,
      lastName,
      email,
      password,
    });

    if (!validation.success) {
      setFormError(validation.error.issues[0]?.message || 'Please check your inputs');
      return;
    }

    setIsLoading(true);
    try {
      await register({ firstName, lastName, email, password });
    } catch (err: any) {
      setFormError(err.message || 'Registration failed. Please try a different email.');
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
          Create Student Account
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Start verifying authentic scholarships and assembling your verified academic record.
        </p>
      </CardHeader>

      <CardContent className="pt-4">
        {formError && (
          <div className="mb-4">
            <Alert variant="error" title="Registration Error">
              {formError}
            </Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              type="text"
              placeholder="e.g. Dawit"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />
            <Input
              label="Last Name"
              type="text"
              placeholder="e.g. Alemu"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              leftIcon={<User className="w-4 h-4" />}
            />
          </div>

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
            placeholder="Create a strong password"
            required
            autoComplete="new-password"
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

          {/* Real-time Password Strength Matrix */}
          <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-lg space-y-1.5 text-xs text-slate-600">
            <p className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
              Security Requirements:
            </p>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <span className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'opacity-100' : 'opacity-30'}`} />
                8+ characters
              </span>
              <span className={`flex items-center gap-1 ${hasUppercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${hasUppercase ? 'opacity-100' : 'opacity-30'}`} />
                Uppercase letter
              </span>
              <span className={`flex items-center gap-1 ${hasLowercase ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${hasLowercase ? 'opacity-100' : 'opacity-30'}`} />
                Lowercase letter
              </span>
              <span className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-400'}`}>
                <Check className={`w-3.5 h-3.5 ${hasNumber ? 'opacity-100' : 'opacity-30'}`} />
                Number (0-9)
              </span>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full mt-2"
            size="md"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Create Account
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
          <span>Already have an account? </span>
          <Link
            href="/login"
            className="font-semibold text-slate-900 hover:underline inline-flex items-center gap-0.5 ml-1"
          >
            Sign in &rarr;
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
