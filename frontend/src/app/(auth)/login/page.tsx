'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear errors
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    let hasError = false;

    if (!email.trim() || !email.includes('@')) {
      setEmailError('A valid email address is required');
      hasError = true;
    }
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.response?.data?.error || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-white tracking-wide uppercase">
          Sign In Space
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Access your real-time collaborative rooms
        </p>
      </div>

      {/* Form Error */}
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

        <div>
          <Input
            label="Password"
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (e.target.value.trim()) setPasswordError('');
            }}
            error={passwordError}
          />
          <div className="flex justify-end mt-2">
            <Link
              href="/forgot-password"
              className="text-[11px] font-bold text-blue-400 hover:text-blue-300 hover:underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <Button type="submit" variant="primary" loading={loading} className="w-full uppercase tracking-wider text-xs font-black py-3.5 mt-2">
          Sign In
        </Button>
      </form>

      {/* Redirect Footer */}
      <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 bg-slate-900/10">
        New to AeroMeet?{' '}
        <Link href="/register" className="font-bold text-blue-400 hover:text-blue-300 hover:underline">
          Create Account
        </Link>
      </div>
    </div>
  );
}