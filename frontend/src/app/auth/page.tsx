'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, CheckCircle2, Lock, Rocket, Mail, User, KeyRound, ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    login, 
    register, 
    verifyOtp, 
    resendOtp, 
    loginWithMagicLink, 
    loginWithGoogle, 
    forgotPassword, 
    resetPassword, 
    user 
  } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const isVerify = searchParams.get('verify') === 'true';
  const isReset = searchParams.get('reset') === 'true';

  const [activeTab, setActiveTab] = useState<'signin' | 'magiclink' | 'register'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Sync search param email
  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Redirect if already logged in (joins invited workspace if redirected with inviteWorkspaceId)
  useEffect(() => {
    async function handlePostLoginRedirect() {
      if (user) {
        const urlParams = new URLSearchParams(window.location.search);
        const inviteWorkspaceId = urlParams.get('inviteWorkspaceId');
        const inviteRole = urlParams.get('inviteRole') || 'member';
        
        if (inviteWorkspaceId) {
          try {
            const { data: existing } = await supabase
              .from('workspace_members')
              .select('*')
              .eq('user_id', user.id)
              .eq('workspace_id', inviteWorkspaceId)
              .maybeSingle();

            if (!existing) {
              await supabase.from('workspace_members').insert({
                user_id: user.id,
                workspace_id: inviteWorkspaceId,
                role: inviteRole
              });
            }

            // Clean up workspace invitations table
            if (user.email) {
              await supabase
                .from('workspace_invitations')
                .delete()
                .eq('workspace_id', inviteWorkspaceId)
                .eq('email', user.email.toLowerCase());
            }
          } catch (e) {
            console.error('Error adding user to invited workspace:', e);
          }
        }
        router.push('/dashboard');
      }
    }
    
    handlePostLoginRedirect();
  }, [user, router]);

  // Atmospheric Particle Canvas Background
  useEffect(() => {
    const canvas = document.getElementById('bg-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;
    let particles: any[] = [];
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Particle {
      x = Math.random() * canvas.width;
      y = Math.random() * canvas.height;
      size = Math.random() * 1.5 + 0.5;
      speedX = (Math.random() - 0.5) * 0.2;
      speedY = (Math.random() - 0.5) * 0.2;
      opacity = Math.random() * 0.5;

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x > canvas.width) this.x = 0;
        if (this.x < 0) this.x = canvas.width;
        if (this.y > canvas.height) this.y = 0;
        if (this.y < 0) this.y = canvas.height;
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = `rgba(6, 182, 212, ${this.opacity})`; // cyan glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < 80; i++) {
      particles.push(new Particle());
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleGoogleCredentialResponse = async (response: any) => {
    const idToken = response.credential;
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(idToken);
      setSuccess('Google sign-in successful! Loading workspace...');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google authentication failed.');
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
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'pill',
          width: '320',
        }
      );
    }
  };

  useEffect(() => {
    // Only initialize Google Sign-in if we're not in verify or reset mode
    if (!isVerify && !isReset) {
      initializeGoogleSignIn();
    }
  }, [isVerify, isReset]);

  const handleSandboxLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login('aksbasg@gmail.com', 'TestPassword123');
      setSuccess('Sandbox profile loaded! Loading workspace...');
    } catch (err: any) {
      console.error(err);
      setError('Sandbox login failed. Please verify that the backend services are running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isVerify) {
        if (!otp.trim()) throw new Error('Verification code is required.');
        await verifyOtp(email || emailParam, otp.trim());
        setSuccess('Verification successful! Logging in...');
      } else if (isReset) {
        if (!otp.trim()) throw new Error('Verification code is required.');
        if (!newPassword.trim()) throw new Error('New password is required.');
        if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
        await resetPassword(email || emailParam, otp.trim(), newPassword);
        setSuccess('Password updated successfully! You can now sign in.');
      } else if (activeTab === 'signin') {
        if (!email.trim() || !password.trim()) throw new Error('Email and password are required.');
        await login(email.trim(), password);
        setSuccess('Sign in successful! Redirecting...');
      } else if (activeTab === 'magiclink') {
        if (!email.trim()) throw new Error('Email is required.');
        await loginWithMagicLink(email.trim());
        setSuccess('Magic Link OTP sent! Please check your email.');
      } else if (activeTab === 'register') {
        if (!name.trim() || !email.trim() || !password.trim()) {
          throw new Error('All fields are required.');
        }
        if (password.length < 6) throw new Error('Password must be at least 6 characters.');
        await register(name.trim(), email.trim(), password);
        setSuccess('Registration successful! Please check your email for verification.');
      }
    } catch (err: any) {
      setError(err.message || 'An authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError(null);
    setSuccess(null);
    try {
      await resendOtp(email || emailParam);
      setSuccess('A new verification code has been sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center font-outfit relative overflow-hidden select-none">
      <canvas id="bg-canvas" className="absolute inset-0 z-0 pointer-events-none"></canvas>

      {/* Atmospheric Glow Spheres */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none z-0"></div>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-[440px] px-6 flex flex-col items-center py-12">
        
        {/* Logo Section */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-650 flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(6,182,212,0.25)] border border-cyan-500/30">
            <Lock className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-cyan-400 glow-text-primary">AeroMeet</h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1.5 font-mono">Encrypted Collaboration</p>
        </div>

        {/* Login Card */}
        <div className="glass-card w-full rounded-2xl p-8 flex flex-col gap-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden bg-slate-900/40 backdrop-blur-xl">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent"></div>
          
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-100">
              {isVerify ? 'Check Your Inbox' : isReset ? 'Reset Password' : 'Welcome to AeroMeet'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {isVerify 
                ? `We sent a confirmation link to ${email || emailParam || 'your email'}` 
                : isReset 
                ? `Enter the reset code sent to ${email || emailParam || 'your email'}` 
                : 'Access your enterprise dashboard'}
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="px-4 py-3 bg-red-950/40 border border-red-900/50 text-[11px] text-red-200 rounded-xl flex items-center gap-2.5 animate-fadeIn text-left">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span className="break-words flex-1">{error}</span>
            </div>
          )}

          {success && (
            <div className="px-4 py-3 bg-cyan-950/40 border border-cyan-800/40 text-[11px] text-cyan-300 rounded-xl flex items-center gap-2.5 animate-fadeIn text-left">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
              <span className="break-words flex-1">{success}</span>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-8 h-8 rounded-full border-4 border-t-cyan-500 border-white/5 animate-spin" />
              <p className="text-xs text-slate-400 mt-3.5">Authenticating security credentials...</p>
            </div>
          )}

          {!loading && (
            <>
              {/* Back to sign in helper for Verify/Reset modes */}
              {(isVerify || isReset) && (
                <button
                  type="button"
                  onClick={() => router.push('/auth')}
                  className="flex items-center gap-1.5 text-xs text-slate-450 hover:text-slate-200 font-bold transition-all w-fit cursor-pointer self-start"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              )}

              {/* ── SIGNUP VERIFY: Show "Check inbox" static screen ── */}
              {isVerify && (
                <div className="flex flex-col items-center text-center gap-5 py-4 animate-fadeIn select-text">
                  {/* Animated envelope icon */}
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.1)]">
                      <Mail size={32} className="text-cyan-400 stroke-[1.5]" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg animate-bounce">
                      <CheckCircle2 size={12} className="text-slate-900 stroke-[3]" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-slate-100">Confirmation email sent!</h3>
                    <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                      We sent a confirmation link to{' '}
                      <span className="text-cyan-400 font-bold break-all">{email || emailParam || 'your email'}</span>.
                      Please open your inbox and click the link to activate your account.
                    </p>
                  </div>

                  <div className="w-full space-y-2.5 pt-1">
                    {/* Step hints */}
                    {[
                      { step: '1', text: 'Open your email inbox' },
                      { step: '2', text: 'Find the email from AeroMeet' },
                      { step: '3', text: 'Click the confirmation link' },
                    ].map(({ step, text }) => (
                      <div key={step} className="flex items-center gap-3 px-4 py-2.5 bg-slate-950/60 border border-slate-900 rounded-xl text-left">
                        <span className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 text-[9px] font-black flex items-center justify-center shrink-0">{step}</span>
                        <span className="text-[11px] text-slate-350">{text}</span>
                      </div>
                    ))}
                  </div>

                  <div className="w-full h-[1px] bg-white/5" />

                  <p className="text-[10px] text-slate-500 italic leading-relaxed max-w-xs">
                    Didn't receive the email?{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      className="text-cyan-400 underline underline-offset-2 font-bold hover:text-cyan-300 transition-colors cursor-pointer"
                    >
                      Click here to resend
                    </button>
                    {' '}or check your spam folder.
                  </p>
                </div>
              )}

              {/* ── RESET / SIGN-IN / REGISTER form ── */}
              {!isVerify && (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                
                  {/* TABS SELECTOR (Only when NOT resetting) */}
                  {!isReset && (
                    <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5 mb-2">
                      {(['signin', 'magiclink', 'register'] as const).map(tab => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => { setActiveTab(tab); setError(null); setSuccess(null); }}
                          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                            activeTab === tab 
                              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/15 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-350 border border-transparent'
                          }`}
                        >
                          {tab === 'signin' ? 'Sign In' : tab === 'magiclink' ? 'Magic Link' : 'Register'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* 1. Display Name (Register tab only) */}
                  {!isReset && activeTab === 'register' && (
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Full Name</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <User className="w-4 h-4 text-slate-600" />
                        </span>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="John Doe"
                          className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* 2. Email Address */}
                  {!isReset && (
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Email Address</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Mail className="w-4 h-4 text-slate-600" />
                        </span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. Password field (Sign In or Register only) */}
                  {!isReset && (activeTab === 'signin' || activeTab === 'register') && (
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Password</label>
                        {activeTab === 'signin' && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (!email.trim()) {
                                setError('Please enter your email address to request a password reset.');
                                return;
                              }
                              setLoading(true);
                              setError(null);
                              try {
                                await forgotPassword(email.trim());
                                setSuccess('Password reset code sent to your email.');
                              } catch (e: any) {
                                setError(e.message || 'Failed to request reset.');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="text-[9px] font-bold text-cyan-455 hover:text-cyan-350 uppercase tracking-wider"
                          >
                            Forgot?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <KeyRound className="w-4 h-4 text-slate-600" />
                        </span>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* 4. OTP code (Reset mode only) */}
                  {isReset && (
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-cyan-500/5 border border-cyan-500/15 rounded-xl">
                        <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <p className="text-[10px] text-slate-400">
                          Reset code sent to <span className="text-cyan-400 font-bold">{email || emailParam || 'your email'}</span>
                        </p>
                      </div>
                      <label className="text-[9px] font-black text-slate-505 uppercase tracking-wider block">6-Digit Reset Code</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        autoFocus
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="• • • • • •"
                        className="w-full bg-slate-955 border border-slate-850 focus:border-cyan-500/50 rounded-xl py-3.5 px-4 text-center tracking-[0.6em] text-base text-cyan-400 placeholder:text-slate-800 outline-none transition-all font-mono"
                      />
                    </div>
                  )}

                  {/* 5. New Password (Reset mode only) */}
                  {isReset && (
                    <div className="space-y-1.5 text-left">
                      <label className="text-[9px] font-black text-slate-505 uppercase tracking-wider block">New Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <KeyRound className="w-4 h-4 text-slate-600" />
                        </span>
                        <input
                          type="password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full bg-slate-950 border border-slate-850 focus:border-cyan-500/50 rounded-xl py-3 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-700 outline-none transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="w-full h-11 bg-cyan-600 hover:bg-cyan-500 text-slate-955 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>
                      {isReset 
                        ? 'Reset Password' 
                        : activeTab === 'signin' 
                        ? 'Sign In' 
                        : activeTab === 'magiclink' 
                        ? 'Send Magic Link' 
                        : 'Create Account'}
                    </span>
                  </button>
              </form>
              )}

              {/* Providers (Google & Sandbox) - Only when NOT verifying or resetting */}
              {!isVerify && !isReset && (
                <div className="flex flex-col items-center w-full gap-4 mt-2">
                  {/* Separator */}
                  <div className="w-full flex items-center gap-4">
                    <div className="h-[1px] bg-white/5 flex-1"></div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">or</span>
                    <div className="h-[1px] bg-white/5 flex-1"></div>
                  </div>

                  {/* Google Sign-in Wrapper */}
                  <div className="flex justify-center w-full min-h-[44px]">
                    <div id="google-signin-btn-container" className="rounded-lg overflow-hidden border border-white/10 shadow-sm"></div>
                  </div>

                  {/* Sandbox Profile Button */}
                  <button
                    type="button"
                    onClick={handleSandboxLogin}
                    className="w-full h-11 bg-transparent hover:bg-cyan-500/5 border border-cyan-500/40 hover:border-cyan-400 text-cyan-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Rocket className="w-4 h-4" />
                    <span>Use Sandbox Demo Profile</span>
                  </button>
                </div>
              )}
            </>
          )}

          {/* Extra info/footer links */}
          <div className="flex justify-between items-center mt-2 pt-4 border-t border-white/5">
            <span className="text-[10px] text-slate-500">SSO Shield Active</span>
            <span className="text-[10px] text-slate-500">Privacy & Terms</span>
          </div>
        </div>

        {/* Footer info */}
        <footer className="mt-8 text-center opacity-40">
          <p className="text-[10px] text-slate-350">Enterprise-grade 256-bit AES Encryption Active</p>
        </footer>
      </main>

      {/* Script to load Google Sign-In SDK */}
      {!isVerify && !isReset && (
        <Script 
          src="https://accounts.google.com/gsi/client" 
          onLoad={initializeGoogleSignIn}
          strategy="afterInteractive"
        />
      )}
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4 font-outfit">
        <div className="w-10 h-10 rounded-full border-4 border-t-cyan-500 border-white/5 animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
