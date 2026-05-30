'use client';

import React from 'react';
import Link from 'next/link';
import { Layers } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden selection:bg-blue-500/30">
      {/* Dynamic graphic accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Brand logo tag */}
      <Link href="/" className="flex items-center gap-2.5 mb-8 group shrink-0 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/10 transition-transform duration-200 group-hover:scale-105">
          <Layers className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-black tracking-tighter text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          AeroMeet
        </span>
      </Link>

      {/* Central Glassmorphic Form Card container */}
      <div className="relative z-10 w-full max-w-md bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col justify-between">
        {children}
      </div>
    </div>
  );
}
