'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

function ResetPasswordContent() {
  const { resetPassword } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [otpError, setOtpError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  // Load email context from params
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      router.replace('/forgot-password'); // Redirect back if no session exists
    }
  }, [searchParams, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setPasswordError('');
    setGeneralError('');

    let hasError = false;

    if (otpCode.length !== 6 || isNaN(Number(otpCode))) {
      setOtpError('A valid 6-digit verification code is required');
      hasError = true;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      await resetPassword(email, otpCode, newPassword);
      alert('Password reset successful! Please sign in with your new password.');
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.response?.data?.error || 'Failed to reset password. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-white tracking-wide uppercase">
          New Credentials
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Complete verification for <span className="text-slate-300 font-bold block mt-0.5 truncate">{email}</span>
        </p>
      </div>

      {/* Errors */}
      {generalError && (
        <div className="px-4 py-3 bg-red-900/20 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl animate-fadeIn">
          {generalError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Verification Code"
          type="text"
          maxLength={6}
          placeholder="Enter 6-digit code"
          value={otpCode}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            setOtpCode(val);
            if (val.length === 6) setOtpError('');
          }}
          error={otpError}
          className="text-center font-bold tracking-[0.2em] py-3 text-slate-100"
        />

        <Input
          label="New Password"
          type="password"
          placeholder="Minimum 6 characters"
          value={newPassword}
          onChange={(e) => {
            setNewPassword(e.target.value);
            if (e.target.value.length >= 6) setPasswordError('');
          }}
          error={passwordError}
        />

        <Button type="submit" variant="primary" loading={loading} className="w-full uppercase tracking-wider text-xs font-black py-3.5 mt-2">
          Save Password
        </Button>
      </form>

      {/* Redirect Footer */}
      <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 bg-slate-900/10">
        Remember your password?{' '}
        <Link href="/login" className="font-bold text-blue-400 hover:text-blue-300 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-sm text-slate-400 uppercase tracking-widest animate-pulse">Loading Reset Context...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}