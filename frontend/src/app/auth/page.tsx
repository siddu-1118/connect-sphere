'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useAuth } from '@/hooks/useAuth';
import { ShieldAlert, CheckCircle2, Lock, Rocket } from 'lucide-react';

function AuthContent() {
  const router = useRouter();
  const { login, loginWithGoogle, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
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
        ctx.fillStyle = `rgba(16, 185, 129, ${this.opacity})`;
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
    initializeGoogleSignIn();
  }, []);

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

  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center font-outfit relative overflow-hidden select-none">
      <canvas id="bg-canvas" className="absolute inset-0 z-0 pointer-events-none"></canvas>

      {/* Atmospheric Glow Spheres */}
      <div className="absolute top-[-100px] left-[-100px] w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full bg-secondary/10 blur-[100px] pointer-events-none z-0"></div>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-[440px] px-6 flex flex-col items-center">
        
        {/* Logo Section */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center mb-4 shadow-[0_0_25px_rgba(16,185,129,0.25)] border border-primary/30">
            <Lock className="w-8 h-8 text-slate-900" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary glow-text-primary">AeroMeet</h1>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1.5">Encrypted Collaboration</p>
        </div>

        {/* Login Card */}
        <div className="glass-card w-full rounded-2xl p-8 flex flex-col gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent"></div>
          
          <div className="text-center">
            <h2 className="text-xl font-bold text-slate-100">Welcome Back</h2>
            <p className="text-xs text-slate-400 mt-1">Sign in to your secure workspace</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="px-4 py-3 bg-red-950/40 border border-red-900/50 text-[11px] text-red-200 rounded-xl flex items-center gap-2.5 animate-fadeIn">
              <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="px-4 py-3 bg-primary/10 border border-primary/20 text-[11px] text-primary rounded-xl flex items-center gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-primary" />
              <span>{success}</span>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-8 h-8 rounded-full border-4 border-t-primary border-white/5 animate-spin" />
              <p className="text-xs text-slate-400 mt-3.5">Authenticating credentials...</p>
            </div>
          )}

          {/* Buttons */}
          {!loading && (
            <div className="flex flex-col items-center w-full gap-5">
              
              {/* Google Sign-in Wrapper */}
              <div className="flex justify-center w-full min-h-[44px]">
                <div id="google-signin-btn-container" className="rounded-lg overflow-hidden border border-white/10 shadow-sm"></div>
              </div>

              {/* Separator */}
              <div className="w-full flex items-center gap-4">
                <div className="h-[1px] bg-white/5 flex-1"></div>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">or</span>
                <div className="h-[1px] bg-white/5 flex-1"></div>
              </div>

              {/* Sandbox Profile Button */}
              <button
                type="button"
                onClick={handleSandboxLogin}
                className="w-full h-11 bg-transparent hover:bg-primary/5 border border-primary/45 hover:border-primary text-primary font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                <Rocket className="w-4 h-4" />
                <span>Use Sandbox Demo Profile</span>
              </button>
            </div>
          )}

          {/* Extra info/footer links */}
          <div className="flex justify-between items-center mt-2 pt-4 border-t border-white/5">
            <span className="text-[10px] text-slate-500">SSO Active</span>
            <span className="text-[10px] text-slate-500">Privacy Policy</span>
          </div>
        </div>

        {/* Footer info */}
        <footer className="mt-8 text-center opacity-40">
          <p className="text-[10px] text-slate-350">Enterprise-grade 256-bit AES Encryption Active</p>
        </footer>
      </main>

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
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4 font-outfit">
        <div className="w-10 h-10 rounded-full border-4 border-t-primary border-white/5 animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}
