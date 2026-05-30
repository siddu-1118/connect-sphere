'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { Compass } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, register: authRegister, verifyOtp, resetPassword, user } = useAuth();

  // Search parameters for deep links
  const queryEmail = searchParams.get('email') || '';
  const isVerifyFlow = searchParams.get('verify') === 'true';
  const isResetFlow = searchParams.get('reset') === 'true';

  // Flows: 'signin-email' | 'signin-password' | 'signup' | 'otp-verify' | 'otp-reset'
  const [flow, setFlow] = useState<'signin-email' | 'signin-password' | 'signup' | 'otp-verify' | 'otp-reset'>('signin-email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');



  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/');
    }
  }, [user, router]);

  // Set flow from query parameters if present
  useEffect(() => {
    if (queryEmail) {
      setEmail(queryEmail);
      if (isVerifyFlow) {
        setFlow('otp-verify');
      } else if (isResetFlow) {
        setFlow('otp-reset');
      }
    }
  }, [queryEmail, isVerifyFlow, isResetFlow]);

  const handleNextEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address');
      return;
    }
    setFlow('signin-password');
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Enter your password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await authRegister(name, email, password);
      setSuccess('Verification passcode sent! Redirecting...');
      setTimeout(() => {
        setFlow('otp-verify');
        setSuccess(null);
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Enter 6-digit OTP code');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await verifyOtp(email, otpCode);
      setSuccess('Verification successful!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6 || !newPassword.trim()) {
      setError('Enter 6-digit OTP and new password');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(email, otpCode, newPassword);
      setSuccess('Password updated successfully. Please sign in.');
      setTimeout(() => {
        setFlow('signin-email');
        setSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSso = () => {
    setError('Google SSO is currently unavailable. Please sign in or register with your email and password.');
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
            <span className="text-xl font-bold tracking-tight text-[#1f1f1f] dark:text-[#e3e3e3] font-product">AeroMeet</span>
          </div>

          {flow === 'signin-email' && (
            <>
              <h1 className="text-2xl font-normal text-[#1f1f1f] dark:text-[#e3e3e3] tracking-tight">Sign in</h1>
              <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] mt-2">to continue to AeroMeet Workspace</p>
            </>
          )}

          {flow === 'signin-password' && (
            <>
              <h1 className="text-2xl font-normal text-[#1f1f1f] dark:text-[#e3e3e3] tracking-tight">Welcome</h1>
              <div className="flex items-center gap-1.5 mt-2 px-3 py-1 bg-[#f0f4f9] dark:bg-[#282a30] rounded-full border border-[#e0e2e6] dark:border-[#3c4043] max-w-full">
                <span className="material-symbols-outlined text-sm text-[#5f6368] dark:text-[#9aa0a6] shrink-0">account_circle</span>
                <span className="text-xs text-[#1f1f1f] dark:text-[#e3e3e3] font-medium truncate">{email}</span>
                <button type="button" onClick={() => setFlow('signin-email')} className="material-symbols-outlined text-xs text-[#1a73e8] dark:text-[#8ab4f8] shrink-0 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full p-0.5">edit</button>
              </div>
            </>
          )}

          {flow === 'signup' && (
            <>
              <h1 className="text-2xl font-normal text-[#1f1f1f] dark:text-[#e3e3e3] tracking-tight">Create your AeroMeet Account</h1>
              <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] mt-2">to access AeroMeet coordinate rooms</p>
            </>
          )}

          {flow === 'otp-verify' && (
            <>
              <h1 className="text-2xl font-normal text-[#1f1f1f] dark:text-[#e3e3e3] tracking-tight">Verify email</h1>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-2">A security passcode was generated. Check the terminal console to activate the account for <strong className="text-[#1f1f1f] dark:text-[#e3e3e3]">{email}</strong>.</p>
            </>
          )}

          {flow === 'otp-reset' && (
            <>
              <h1 className="text-2xl font-normal text-[#1f1f1f] dark:text-[#e3e3e3] tracking-tight">Reset password</h1>
              <p className="text-xs text-[#5f6368] dark:text-[#9aa0a6] mt-2">Enter the activation code from server logs and type a new password.</p>
            </>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 px-4 py-3 bg-[#fdeded] dark:bg-[#2c1a1a] border border-[#f5c2c2] dark:border-[#5c2626] text-xs text-[#c62828] dark:text-[#f2b8b8] rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 px-4 py-3 bg-[#e8f5e9] dark:bg-[#1a2c1e] border border-[#a5d6a7] dark:border-[#265c2e] text-xs text-[#2e7d32] dark:text-[#b8f2b8] rounded-xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
            <span>{success}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="flex-1 flex flex-col justify-between">
          
          {flow === 'signin-email' && (
            <form onSubmit={handleNextEmail} className="space-y-6">
              <div className="relative group">
                <input
                  type="email"
                  id="email-input"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className="w-full px-4 py-4 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] bg-transparent border border-[#74777f] dark:border-[#8e9099] rounded-lg focus:outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-0 peer transition-all placeholder-transparent"
                />
                <label 
                  htmlFor="email-input"
                  className="absolute left-3 top-3.5 px-1 bg-white dark:bg-[#1a1c22] text-[#5f6368] dark:text-[#9aa0a6] text-sm transform transition-all -translate-y-6 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-[#1a73e8] dark:peer-focus:text-[#8ab4f8]"
                >
                  Email address
                </label>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setFlow('signup')}
                  className="text-xs font-semibold text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#1a73e8]/5 dark:hover:bg-[#8ab4f8]/5 px-3 py-2.5 rounded-full transition-colors"
                >
                  Create account
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-full tracking-wide shadow-sm hover:shadow-md transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </form>
          )}

          {flow === 'signin-password' && (
            <form onSubmit={handleSignInSubmit} className="space-y-6">
              <div className="relative group">
                <input
                  type="password"
                  id="password-input"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="w-full px-4 py-4 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] bg-transparent border border-[#74777f] dark:border-[#8e9099] rounded-lg focus:outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-0 peer transition-all placeholder-transparent"
                />
                <label 
                  htmlFor="password-input"
                  className="absolute left-3 top-3.5 px-1 bg-white dark:bg-[#1a1c22] text-[#5f6368] dark:text-[#9aa0a6] text-sm transform transition-all -translate-y-6 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-[#1a73e8] dark:peer-focus:text-[#8ab4f8]"
                >
                  Enter your password
                </label>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setFlow('signin-email')}
                  className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#5f6368]/5 dark:hover:bg-[#9aa0a6]/5 px-3 py-2.5 rounded-full transition-colors"
                >
                  Back
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-full tracking-wide shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Sign in'}
                </button>
              </div>
            </form>
          )}

          {flow === 'signup' && (
            <form onSubmit={handleSignUpSubmit} className="space-y-5">
              <div className="relative group">
                <input
                  type="text"
                  id="signup-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=" "
                  className="w-full px-4 py-3.5 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] bg-transparent border border-[#74777f] dark:border-[#8e9099] rounded-lg focus:outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] peer transition-all placeholder-transparent"
                />
                <label 
                  htmlFor="signup-name"
                  className="absolute left-3 top-3 px-1 bg-white dark:bg-[#1a1c22] text-[#5f6368] dark:text-[#9aa0a6] text-sm transform transition-all -translate-y-5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 peer-focus:scale-75 peer-focus:text-[#1a73e8] dark:peer-focus:text-[#8ab4f8]"
                >
                  First name / Display name
                </label>
              </div>

              <div className="relative group">
                <input
                  type="email"
                  id="signup-email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className="w-full px-4 py-3.5 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] bg-transparent border border-[#74777f] dark:border-[#8e9099] rounded-lg focus:outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] peer transition-all placeholder-transparent"
                />
                <label 
                  htmlFor="signup-email"
                  className="absolute left-3 top-3 px-1 bg-white dark:bg-[#1a1c22] text-[#5f6368] dark:text-[#9aa0a6] text-sm transform transition-all -translate-y-5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 peer-focus:scale-75 peer-focus:text-[#1a73e8] dark:peer-focus:text-[#8ab4f8]"
                >
                  Email address
                </label>
              </div>

              <div className="relative group">
                <input
                  type="password"
                  id="signup-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="w-full px-4 py-3.5 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] bg-transparent border border-[#74777f] dark:border-[#8e9099] rounded-lg focus:outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] peer transition-all placeholder-transparent"
                />
                <label 
                  htmlFor="signup-password"
                  className="absolute left-3 top-3 px-1 bg-white dark:bg-[#1a1c22] text-[#5f6368] dark:text-[#9aa0a6] text-sm transform transition-all -translate-y-5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 peer-focus:scale-75 peer-focus:text-[#1a73e8] dark:peer-focus:text-[#8ab4f8]"
                >
                  Password
                </label>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setFlow('signin-email')}
                  className="text-xs font-semibold text-[#1a73e8] dark:text-[#8ab4f8] hover:bg-[#1a73e8]/5 dark:hover:bg-[#8ab4f8]/5 px-3 py-2.5 rounded-full transition-colors"
                >
                  Sign in instead
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-full tracking-wide shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Register'}
                </button>
              </div>
            </form>
          )}

          {flow === 'otp-verify' && (
            <form onSubmit={handleVerifyOtpSubmit} className="space-y-6">
              <div className="relative group">
                <input
                  type="text"
                  maxLength={6}
                  id="otp-input"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder=" "
                  className="w-full px-4 py-4 text-center text-sm font-mono tracking-widest text-[#1f1f1f] dark:text-[#e3e3e3] bg-transparent border border-[#74777f] dark:border-[#8e9099] rounded-lg focus:outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] focus:ring-0 peer transition-all placeholder-transparent"
                />
                <label 
                  htmlFor="otp-input"
                  className="absolute left-3 top-3.5 px-1 bg-white dark:bg-[#1a1c22] text-[#5f6368] dark:text-[#9aa0a6] text-sm transform transition-all -translate-y-6 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-6 peer-focus:scale-75 peer-focus:text-[#1a73e8] dark:peer-focus:text-[#8ab4f8] w-[calc(100%-24px)] text-left"
                >
                  Enter 6-digit OTP code
                </label>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setFlow('signin-email')}
                  className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#5f6368]/5 dark:hover:bg-[#9aa0a6]/5 px-3 py-2.5 rounded-full transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-full tracking-wide shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </form>
          )}

          {flow === 'otp-reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
              <div className="relative group">
                <input
                  type="text"
                  maxLength={6}
                  id="reset-otp-input"
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder=" "
                  className="w-full px-4 py-3.5 text-center text-sm font-mono tracking-widest text-[#1f1f1f] dark:text-[#e3e3e3] bg-transparent border border-[#74777f] dark:border-[#8e9099] rounded-lg focus:outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] peer transition-all placeholder-transparent"
                />
                <label 
                  htmlFor="reset-otp-input"
                  className="absolute left-3 top-3 px-1 bg-white dark:bg-[#1a1c22] text-[#5f6368] dark:text-[#9aa0a6] text-sm transform transition-all -translate-y-5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 peer-focus:scale-75 peer-focus:text-[#1a73e8] dark:peer-focus:text-[#8ab4f8] w-[calc(100%-24px)] text-left"
                >
                  Enter 6-digit OTP code
                </label>
              </div>

              <div className="relative group">
                <input
                  type="password"
                  id="reset-password-input"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder=" "
                  className="w-full px-4 py-3.5 text-sm text-[#1f1f1f] dark:text-[#e3e3e3] bg-transparent border border-[#74777f] dark:border-[#8e9099] rounded-lg focus:outline-none focus:border-[#1a73e8] dark:focus:border-[#8ab4f8] peer transition-all placeholder-transparent"
                />
                <label 
                  htmlFor="reset-password-input"
                  className="absolute left-3 top-3 px-1 bg-white dark:bg-[#1a1c22] text-[#5f6368] dark:text-[#9aa0a6] text-sm transform transition-all -translate-y-5 scale-75 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:-translate-y-5 peer-focus:scale-75 peer-focus:text-[#1a73e8] dark:peer-focus:text-[#8ab4f8]"
                >
                  Enter new password
                </label>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setFlow('signin-email')}
                  className="text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#5f6368]/5 dark:hover:bg-[#9aa0a6]/5 px-3 py-2.5 rounded-full transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-full tracking-wide shadow-sm hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          )}

          {/* Google SSO options */}
          {(flow === 'signin-email' || flow === 'signup') && (
            <div className="mt-8 pt-6 border-t border-[#e0e2e6] dark:border-[#2e3138] flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoogleSso}
                className="w-full py-3 px-4 bg-white dark:bg-[#1a1c22] hover:bg-[#f8fafd] dark:hover:bg-[#282a30] border border-[#dadce0] dark:border-[#3c4043] rounded-full text-xs font-medium text-[#3c4043] dark:text-[#e3e3e3] flex items-center justify-center gap-3 transition-colors cursor-pointer shadow-sm"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.5 12c0-.7-.1-1.3-.2-1.9H12v3.7h5.9c-.3 1.4-1.1 2.6-2.3 3.4l3.1 2.4c1.8-1.7 2.8-4.2 2.8-7.6z"/>
                  <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.1-2.4c-1 .7-2.2 1.1-4.2 1.1-3.2 0-6-2.2-7-5.2L1.8 17c2 3.9 6 6 10.2 6z"/>
                  <path fill="#FBBC05" d="M5 13.8c-.3-.8-.4-1.7-.4-2.8s.1-2 .4-2.8L1.8 5.4c-1 1.8-1.5 4-1.5 6.6s.5 4.8 1.5 6.6L5 13.8z"/>
                  <path fill="#EA4335" d="M12 4.8c1.6 0 3.1.6 4.2 1.7l3.2-3.2C17.5 1.6 15 1 12 1 7.8 1 3.8 3.1 1.8 7L5 12.2c1-3 3.8-5.2 7-5.2z"/>
                </svg>
                <span>Sign in with Google</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEmail('aksbasg@gmail.com');
                  setPassword('TestPassword123');
                  setFlow('signin-password');
                  setSuccess('Demo account loaded. Click Sign in to continue.');
                  setError(null);
                }}
                className="w-full py-2.5 text-center text-xs font-semibold text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#1a73e8] dark:hover:text-[#8ab4f8] transition-colors rounded-full hover:bg-slate-200/50 dark:hover:bg-slate-800/50"
              >
                Use Sandbox Demo Profile
              </button>
            </div>
          )}

        </div>

      </div>



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
