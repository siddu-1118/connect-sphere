'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function RegisterPage() {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear errors
    setNameError('');
    setEmailError('');
    setPasswordError('');
    setGeneralError('');

    let hasError = false;

    if (!name.trim()) {
      setNameError('Name is required');
      hasError = true;
    }
    if (!email.trim() || !email.includes('@')) {
      setEmailError('A valid email is required');
      hasError = true;
    }
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      hasError = true;
    }

    if (hasError) return;

    setLoading(true);
    try {
      await register(name, email, password);
    } catch (err: any) {
      console.error(err);
      setGeneralError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-white tracking-wide uppercase">
          Create Account
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Set up a premium collaborative workspace
        </p>
      </div>

      {/* Form error warning */}
      {generalError && (
        <div className="px-4 py-3 bg-red-900/20 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl animate-fadeIn">
          {generalError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Full Name"
          type="text"
          placeholder="e.g. John Doe"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (e.target.value.trim()) setNameError('');
          }}
          error={nameError}
        />

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

        <Input
          label="Password"
          type="password"
          placeholder="Minimum 6 characters"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (e.target.value.length >= 6) setPasswordError('');
          }}
          error={passwordError}
        />

        <Button type="submit" variant="primary" loading={loading} className="w-full uppercase tracking-wider text-xs font-black py-3.5 mt-2">
          Register
        </Button>
      </form>

      {/* Footer redirection */}
      <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500 bg-slate-900/10">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-blue-400 hover:text-blue-300 hover:underline">
          Sign In
        </Link>
      </div>
    </div>
  );
}