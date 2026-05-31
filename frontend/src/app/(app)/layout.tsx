'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '../../components/layout/AuthGuard';
import { Sidebar } from '../../components/layout/Sidebar';
import { CommandSearch } from '../../components/layout/CommandSearch';
import { BottomNav } from '../../components/layout/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Meeting views get a full-screen shell (no navigation)
  const isMeetingView = pathname.startsWith('/room') || pathname.startsWith('/meet');

  if (isMeetingView) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-[#0B0F17] text-slate-200">
          {children}
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex bg-[#0B0F17] text-slate-200 font-outfit">
        {/* Teams-style 240px aside drawer on desktop, hidden on mobile */}
        <Sidebar
          onSearchClick={() => setSearchOpen(true)}
        />

        {/* Main content area — offset by sidebar width on desktop, bottom bar on mobile */}
        <main className="flex-1 md:ml-[240px] ml-0 pb-16 md:pb-0 h-screen overflow-hidden flex flex-col bg-[#0f131c]">
          {children}
        </main>

        {/* Floating bottom tab nav for mobile layout */}
        <BottomNav />

        {/* Global command palette */}
        <CommandSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </AuthGuard>
  );
}
