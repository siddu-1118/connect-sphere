'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '../../hooks/useAuth';
import { Compass, AlertCircle, CheckCircle2 } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const { login, loginWithGoogle, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  const handleGoogleCredentialResponse = async (response: any) => {
    const idToken = response.credential;
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(idToken);
      setSuccess('Google sign-in successful! Redirecting...');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const initializeGoogleSignIn = () => {
    if (typeof window !== 'undefined' && (window as any).google) {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '786438965935-8lq6d6d7pt7h7l7d7pt7h7l7d7pt7h7l.apps.googleusercontent.com';
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredentialResponse,
      });
      (window as any).google.accounts.id.renderButton(
        document.getElementById('google-signin-btn-container'),
        {
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: '320',
        }
      );
    }
  };

  useEffect(() => {
    initializeGoogleSignIn();
  }, []);

  const handleSandboxLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login('aksbasg@gmail.com', 'TestPassword123');
      setSuccess('Sandbox profile loaded! Redirecting...');
    } catch (err: any) {
      console.error(err);
      setError('Sandbox login failed. Make sure backend and database are running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f9] dark:bg-[#0f1115] flex flex-col items-center justify-center p-4 font-sans select-none relative transition-colors duration-200">
      
      {/* Outer Card Container */}
      <div className="w-full max-w-[450px] bg-white dark:bg-[#1a1c22] border border-[#e0e2e6] dark:border-[#2e3138] rounded-[28px] p-8 md:p-10 shadow-sm relative z-10 flex flex-col">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow shadow-indigo-500/25">
              <Compass className="w-4.5 h-4.5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3]">AeroMeet</span>
          </div>

          <h1 className="text-2xl font-normal text-[#1f1f1f] dark:text-[#e3e3e3] tracking-tight">Sign in</h1>
          <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] mt-2">to continue to AeroMeet Workspace</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-[#fdeded] dark:bg-[#2c1a1a] border border-[#f5c2c2] dark:border-[#5c2626] text-xs text-[#c62828] dark:text-[#f2b8b8] rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#c62828] dark:text-[#f2b8b8]" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 px-4 py-3 bg-[#e8f5e9] dark:bg-[#1a2c1e] border border-[#a5d6a7] dark:border-[#265c2e] text-xs text-[#2e7d32] dark:text-[#b8f2b8] rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#2e7d32] dark:text-[#b8f2b8]" />
            <span>{success}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-8 h-8 rounded-full border-4 border-t-indigo-500 border-slate-200 dark:border-slate-800 animate-spin" />
            <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-3">Authenticating...</p>
          </div>
        )}

        {/* Google Sign-In button */}
        {!loading && (
          <div className="flex flex-col items-center w-full mt-4">
            <div id="google-signin-btn-container" className="my-2"></div>
            
            {/* Divider */}
            <div className="w-full flex items-center gap-3 my-6">
              <div className="h-[1px] bg-[#e0e2e6] dark:bg-[#2e3138] flex-1"></div>
              <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-wider">or</span>
              <div className="h-[1px] bg-[#e0e2e6] dark:bg-[#2e3138] flex-1"></div>
            </div>

            {/* Sandbox Profile */}
            <button
              type="button"
              onClick={handleSandboxLogin}
              className="w-full py-2.5 text-center text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors rounded-full hover:bg-[#1a73e8]/5 dark:hover:bg-[#8ab4f8]/5 border border-dashed border-slate-300 dark:border-slate-800 cursor-pointer"
            >
              Use Sandbox Demo Profile
            </button>
          </div>
        )}

      </div>

      {/* Script to load Google Sign-In SDK */}
      <Script 
        src="https://accounts.google.com/gsi/client" 
        onLoad={initializeGoogleSignIn}
        strategy="afterInteractive"
      />
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f0f4f9] dark:bg-[#0f1115] flex items-center justify-center p-4 font-sans">
        <div className="w-10 h-10 rounded-full border-4 border-t-[#1a73e8] border-[#e0e2e6] animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
