'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '../lib/api';
import { setTokens, clearTokens, getUser, setUser as persistUser, getAccessToken } from '../lib/auth';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (email: string, otpCode: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (name?: string, avatarUrl?: string | null) => Promise<void>;
  updateNotifications: (emailPref: boolean, pushPref: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  // Hydrate user session on mount
  useEffect(() => {
    async function hydrate() {
      const accessToken = getAccessToken();
      const localUser = getUser();
      
      if (accessToken && localUser) {
        setUser(localUser);
        try {
          // Verify against backend to ensure session is active
          const response = await api.get('/users/me');
          if (response.data.success) {
            const fetchedUser = response.data.user;
            setUser(fetchedUser);
            persistUser(fetchedUser);
          }
        } catch (e) {
          console.error('Session hydration failed:', e);
          clearTokens();
          setUser(null);
        }
      }
      setLoading(false);
    }
    
    hydrate();
  }, []);

  // Register user
  const register = async (name: string, email: string, password: string) => {
    await api.post('/auth/register', { name, email, password });
    router.push(`/auth?email=${encodeURIComponent(email)}&verify=true`);
  };

  // Verify OTP
  const verifyOtp = async (email: string, otpCode: string) => {
    const response = await api.post('/auth/verify-otp', { email, otpCode });
    const { accessToken, refreshToken, user: loggedUser } = response.data;
    
    setTokens(accessToken, refreshToken);
    setUser(loggedUser);
    persistUser(loggedUser);
    
    router.push('/');
  };

  // Resend OTP
  const resendOtp = async (email: string) => {
    await api.post('/auth/resend-otp', { email });
  };

  // Login
  const login = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { accessToken, refreshToken, user: loggedUser } = response.data;
      
      setTokens(accessToken, refreshToken);
      setUser(loggedUser);
      persistUser(loggedUser);
      
      router.push('/');
    } catch (error: any) {
      // If unverified, redirect to OTP verification screen
      if (error.response?.status === 403 && error.response?.data?.isUnverified) {
        await resendOtp(email); // Automatically trigger a fresh OTP
        router.push(`/auth?email=${encodeURIComponent(email)}&verify=true`);
        return;
      }
      throw error;
    }
  };

  // Forgot password OTP request
  const forgotPassword = async (email: string) => {
    await api.post('/auth/forgot-password', { email });
    router.push(`/auth?email=${encodeURIComponent(email)}&reset=true`);
  };

  // Reset password
  const resetPassword = async (email: string, otpCode: string, newPassword: string) => {
    await api.post('/auth/reset-password', { email, otpCode, newPassword });
    router.push('/auth');
  };

  // Logout
  const logout = async () => {
    const refreshToken = localStorage.getItem('cs_refresh_token');
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch (e) {
        // Suppress failure and clear tokens anyway
      }
    }
    clearTokens();
    setUser(null);
    router.push('/auth');
  };

  // Update name and avatarUrl
  const updateProfile = async (name?: string, avatarUrl?: string | null) => {
    const response = await api.patch('/users/me', { name, avatarUrl });
    if (response.data.success) {
      const updatedUser = response.data.user;
      setUser(updatedUser);
      persistUser(updatedUser);
    }
  };

  // Update notification parameters
  const updateNotifications = async (emailPref: boolean, pushPref: boolean) => {
    const response = await api.patch('/users/me/notifications', {
      notificationEmail: emailPref,
      notificationPush: pushPref,
    });
    if (response.data.success) {
      const updatedUser = response.data.user;
      setUser(updatedUser);
      persistUser(updatedUser);
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    register,
    verifyOtp,
    resendOtp,
    login,
    forgotPassword,
    resetPassword,
    logout,
    updateProfile,
    updateNotifications,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be consumed inside an AuthProvider');
  }
  return context;
}