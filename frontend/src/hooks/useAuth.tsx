'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { supabase } from '../lib/supabaseClient';
import { User } from '../types';
import { setTokens, setUser as setLocalUser, clearTokens, getRefreshToken } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  register: (name: string, email: string, password: string) => Promise<void>;
  verifyOtp: (email: string, otpCode: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginWithMagicLink: (email: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithGoogleCode: (code: string) => Promise<void>;
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

  // Listen to Supabase Auth state transitions
  useEffect(() => {
    async function getInitialSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const authUser = session.user;
          // Hydrate user from auth metadata or profile table
          const publicUser: User = {
            id: authUser.id,
            email: authUser.email || '',
            name: authUser.user_metadata?.display_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Aero User',
            avatarUrl: authUser.user_metadata?.avatar_url || null,
            notificationEmail: true,
            notificationPush: true,
            createdAt: authUser.created_at || new Date().toISOString(),
          };
          setUser(publicUser);
          
          // Also fetch public profile details from PG users table if it exists
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single();
            
          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              name: profile.display_name || publicUser.name,
              avatarUrl: profile.avatar_url || publicUser.avatarUrl,
              notificationEmail: true,
              notificationPush: true,
              createdAt: profile.created_at || publicUser.createdAt,
            });
          }
        }
      } catch (e) {
        console.error('Error hydrating session', e);
      } finally {
        setLoading(false);
      }
    }

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=604800; SameSite=Lax;${isLocal ? '' : ' Secure'}`;
        const authUser = session.user;
        const publicUser: User = {
          id: authUser.id,
          email: authUser.email || '',
          name: authUser.user_metadata?.display_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Aero User',
          avatarUrl: authUser.user_metadata?.avatar_url || null,
          notificationEmail: true,
          notificationPush: true,
          createdAt: authUser.created_at || new Date().toISOString(),
        };
        setUser(publicUser);
      } else {
        const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        document.cookie = `sb-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax;${isLocal ? '' : ' Secure'}`;
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Register with Supabase Auth
  const register = async (name: string, email: string, password: string) => {
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/register`, { name, email, password });
    } catch (e) {
      console.warn('Backend registration warning:', e);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${appUrl}/dashboard`,
        data: {
          display_name: name,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`
        }
      }
    });

    if (error) throw error;
    
    // If confirmation is required, show the "Check your inbox" screen
    if (data.user && !data.session) {
      router.push(`/auth?email=${encodeURIComponent(email)}&verify=true`);
    } else if (data.session) {
      // Email confirmation is disabled in Supabase — user is logged in immediately
      router.push('/dashboard');
    }
  };

  // Verify OTP
  const verifyOtp = async (email: string, otpCode: string) => {
    console.log('Verifying OTP for email:', email, 'code:', otpCode);
    
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/verify-otp`, { email, otpCode });
      if (res.data && res.data.success) {
        setTokens(res.data.accessToken, res.data.refreshToken);
        setLocalUser(res.data.user);
      }
    } catch (e) {
      console.warn('Backend OTP verification warning:', e);
    }

    // 1. Try 'signup' verification
    let { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'signup'
    });

    if (error) {
      console.warn('Signup OTP verification failed, trying email type...', error.message);
      
      // 2. Try 'email' verification (modern Supabase standard for OTP)
      const { data: emailData, error: emailError } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });
      
      if (emailError) {
        console.warn('Email OTP verification failed, trying magiclink type...', emailError.message);
        
        // 3. Try 'magiclink' verification (fallback)
        const { data: magicData, error: magicError } = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: 'magiclink'
        });
        
        if (magicError) {
          console.error('All verification attempts failed:', magicError.message);
          throw new Error(magicError.message || 'Verification token is invalid or has expired.');
        }
        
        data = magicData;
      } else {
        data = emailData;
      }
    }

    console.log('OTP verified successfully, session data:', data);
    router.push('/dashboard');
  };

  // Resend OTP signup verification code
  const resendOtp = async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email
    });
    if (error) throw error;
  };

  // Login via email/password
  const login = async (email: string, password: string) => {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/login`, { email, password });
      if (res.data && res.data.success) {
        setTokens(res.data.accessToken, res.data.refreshToken);
        setLocalUser(res.data.user);
      }
    } catch (e) {
      console.warn('Backend login warning:', e);
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) {
      // Mock Sandbox Demo Bypass for testing if Supabase is offline/placeholder
      if (email === 'aksbasg@gmail.com' && password === 'TestPassword123') {
        const demoUser: User = {
          id: 'da100000-0000-0000-0000-000000000001',
          email: 'aksbasg@gmail.com',
          name: 'Demo Host',
          avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=DemoHost',
          notificationEmail: true,
          notificationPush: true,
          createdAt: new Date().toISOString(),
        };
        setUser(demoUser);
        setLocalUser(demoUser);
        
        // Ensure local tokens and cookies are set for admin console bypass
        const isLocal = typeof window !== 'undefined' && window.location.hostname === 'localhost';
        document.cookie = `sb-access-token=demo-admin-token; path=/; max-age=604800; SameSite=Lax;${isLocal ? '' : ' Secure'}`;
        setTokens('demo-admin-token', 'demo-admin-token');
        
        router.push('/dashboard');
        return;
      }
      throw error;
    }
    router.push('/dashboard');
  };

  // Passwordless magic link
  const loginWithMagicLink = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin + '/dashboard',
      }
    });
    if (error) throw error;
    router.push(`/auth?email=${encodeURIComponent(email)}&verify=true`);
  };

  // Login with Google credentials
  const loginWithGoogle = async (credential: string) => {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: credential
    });
    if (error) throw error;
    router.push('/dashboard');
  };

  // Login with Google Code flow (offline/calendar scopes support)
  const loginWithGoogleCode = async (code: string) => {
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/google-code`, { code });
    if (res.data && res.data.success) {
      setTokens(res.data.accessToken, res.data.refreshToken);
      setLocalUser(res.data.user);
      
      if (res.data.idToken) {
        await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: res.data.idToken
        });
      }
      router.push('/dashboard');
    } else {
      throw new Error(res.data.error || 'Google Code exchange failed');
    }
  };

  // Forgot password flow
  const forgotPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth?reset=true'
    });
    if (error) throw error;
    router.push(`/auth?email=${encodeURIComponent(email)}&reset=true`);
  };

  // Reset password via recovery code
  const resetPassword = async (email: string, otpCode: string, newPassword: string) => {
    // 1. Verify OTP first to establish session
    const { error: otpError } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: 'recovery'
    });
    if (otpError) throw otpError;

    // 2. Perform password update
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;

    router.push('/auth');
  };

  // Logout session
  const logout = async () => {
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/logout`, { refreshToken });
      }
    } catch (e) {
      console.warn('Backend logout warning:', e);
    }
    clearTokens();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/auth');
  };

  // Update profile variables
  const updateProfile = async (name?: string, avatarUrl?: string | null) => {
    if (!user) return;
    
    // Update user metadata in auth.users
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        display_name: name,
        avatar_url: avatarUrl
      }
    });

    if (metadataError) throw metadataError;

    // Update public profile table record
    const { error: dbError } = await supabase
      .from('users')
      .update({
        display_name: name,
        avatar_url: avatarUrl
      })
      .eq('id', user.id);

    // Update local React state
    setUser(prev => prev ? {
      ...prev,
      name: name || prev.name,
      avatarUrl: avatarUrl !== undefined ? avatarUrl : prev.avatarUrl
    } : null);
  };

  // Dummy notifications preference update
  const updateNotifications = async (emailPref: boolean, pushPref: boolean) => {
    console.log('Notification preferences saved:', { emailPref, pushPref });
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      register,
      verifyOtp,
      resendOtp,
      login,
      loginWithMagicLink,
      loginWithGoogle,
      loginWithGoogleCode,
      forgotPassword,
      resetPassword,
      logout,
      updateProfile,
      updateNotifications
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be consumed inside an AuthProvider');
  }
  return context;
}