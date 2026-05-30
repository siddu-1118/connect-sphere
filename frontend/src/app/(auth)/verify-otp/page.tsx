'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

function VerifyOtpContent() {
  const { verifyOtp, resendOtp } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Load email from search parameters
  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    } else {
      router.replace('/register'); // Redirect back if no context exists
    }
  }, [searchParams, router]);

  // Resend cooldown timer count downs
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setGeneralError('');

    if (otpCode.length !== 6 || isNaN(Number(otpCode))) {
      setOtpError('Please enter a valid 6-digit numeric verification code');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(email, otpCode);
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.response?.data?.error || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;

    setResending(true);
    setGeneralError('');
    try {
      await resendOtp(email);
      setResendCooldown(60); // 1 minute cooldown
      alert('Verification code resent successfully!');
    } catch (err: any) {
      console.error(err);
      setGeneralError('Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-white tracking-wide uppercase">
          Verify Email
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter the 6-digit code sent to <span className="text-slate-300 font-bold block mt-0.5 truncate">{email}</span>
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
          placeholder="e.g. 123456"
          value={otpCode}
          onChange={(e) => {
            const val = e.target.value.replace(/[^0-9]/g, ''); // keep only numbers
            setOtpCode(val);
            if (val.length === 6) setOtpError('');
          }}
          error={otpError}
          className="text-center font-bold tracking-[0.25em] text-lg py-3.5"
        />

        <Button type="submit" variant="primary" loading={loading} className="w-full uppercase tracking-wider text-xs font-black py-3.5 mt-2">
          Verify & Sign In
        </Button>
      </form>

      {/* Resend actions */}
      <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 bg-slate-900/10 flex flex-col gap-2">
        <span>Didn't receive a verification code?</span>
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || resending}
          className="font-bold text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed hover:underline text-xs bg-transparent border-none py-1 focus:outline-none"
        >
          {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : 'Resend Verification Code'}
        </button>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center p-8">
        <p className="text-sm text-slate-400 uppercase tracking-widest animate-pulse">Loading Verification Context...</p>
      </div>
    }>
      <VerifyOtpContent />
    </Suspense>
  );
}