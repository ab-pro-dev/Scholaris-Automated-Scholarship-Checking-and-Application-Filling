'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { UserDTO, UserProfileDTO } from '@scholaris/types';
import { LoginInput, RegisterInput } from '@scholaris/validation';
import { api } from '../lib/api';
import { PREVIEW_PROFILE, PREVIEW_USER } from '../lib/preview-data';

interface AuthContextValue {
  user: UserDTO | null;
  profile: UserProfileDTO | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const IS_PREVIEW_MODE = process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [profile, setProfile] = useState<UserProfileDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = api.getAccessToken();
    if (!token) {
      if (IS_PREVIEW_MODE) {
        setUser(PREVIEW_USER);
        setProfile(PREVIEW_PROFILE);
      } else {
        setUser(null);
        setProfile(null);
      }
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setProfile(data.profile);
    } catch {
      api.clearTokens();
      if (IS_PREVIEW_MODE) {
        setUser(PREVIEW_USER);
        setProfile(PREVIEW_PROFILE);
      } else {
        setUser(null);
        setProfile(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (input: LoginInput) => {
    const data = await api.login(input);
    setUser(data.user);
    setProfile(data.profile ?? null);
  };

  const register = async (input: RegisterInput) => {
    const data = await api.register(input);
    setUser(data.user);
    setProfile(data.profile ?? null);
  };

  const logout = () => {
    api.clearTokens();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
