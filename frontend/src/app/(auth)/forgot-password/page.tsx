'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setGeneralError('');

    if (!email.trim() || !email.includes('@')) {
      setEmailError('A valid email address is required');
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.response?.data?.error || 'Failed to request reset. Please verify your email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-white tracking-wide uppercase">
          Reset Password
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Enter your email to receive a password reset code
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
          label="Email Address"
          type="email"
          placeholder="e.g. name@domain.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (e.target.value.trim()) setEmailError('');
          }}
          error={emailError}
        />

        <Button type="submit" variant="primary" loading={loading} className="w-full uppercase tracking-wider text-xs font-black py-3.5 mt-2">
          Send Reset Code
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