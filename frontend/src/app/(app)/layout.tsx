'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '../../components/layout/AuthGuard';
import { Sidebar } from '../../components/layout/Sidebar';
import { CommandSearch } from '../../components/layout/CommandSearch';

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
        <div className="min-h-screen bg-[#1a1a2e] text-slate-100">
          {children}
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex bg-[#1a1a2e] text-slate-100">
        {/* Teams-style 60px icon rail */}
        <Sidebar
          onSearchClick={() => setSearchOpen(true)}
        />

        {/* Main content area — offset by sidebar width */}
        <main className="flex-1 ml-[60px] h-screen overflow-hidden flex flex-col bg-[#1e1e35]">
          {children}
        </main>

        {/* Global command palette */}
        <CommandSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </div>
    </AuthGuard>
  );
}
