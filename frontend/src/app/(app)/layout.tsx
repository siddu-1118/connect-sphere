'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthGuard } from '../../components/layout/AuthGuard';
import { Sidebar } from '../../components/layout/Sidebar';
import { CommandSearch } from '../../components/layout/CommandSearch';
import { BottomNav } from '../../components/layout/BottomNav';
import PushNotificationPrompt from '../../components/ui/PushNotificationPrompt';

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
  const isMeetingView = 
    (pathname.startsWith('/meet/') && !pathname.startsWith('/meet/preview') && pathname !== '/meet/join' && pathname !== '/meet/create') ||
    (pathname.startsWith('/room/') && pathname !== '/room/instant');

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
      <div className="min-h-screen flex bg-[#F8FAFC] text-slate-800 font-outfit">
        {/* Left Navigation Rail (desktop) */}
        <Sidebar />

        {/* Main content area — offset by left rail width on desktop, bottom dock on mobile */}
        <main className="flex-1 md:ml-20 ml-0 pb-20 md:pb-0 h-screen overflow-hidden flex flex-col bg-[#F8FAFC]">
          {children}
        </main>

        {/* Sticky floating bottom dock for mobile layout */}
        <BottomNav />

        {/* Global command palette */}
        <CommandSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />

        {/* Push notification setup banner */}
        <PushNotificationPrompt />
      </div>
    </AuthGuard>
  );
}
