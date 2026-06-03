'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell, Grid, MessageSquare, Clock, Settings, LogOut, ChevronUp, Circle, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';
import { cn } from '../../lib/utils';

type Presence = 'available' | 'busy' | 'dnd' | 'away' | 'offline';

const presenceConfig: Record<Presence, { color: string; label: string; ringColor: string }> = {
  available: { color: 'bg-emerald-500', label: 'Available', ringColor: 'ring-emerald-500/20' },
  busy:      { color: 'bg-rose-500',   label: 'Busy',      ringColor: 'ring-rose-500/20' },
  dnd:       { color: 'bg-red-650',    label: 'Do not disturb', ringColor: 'ring-red-650/20' },
  away:      { color: 'bg-amber-500',  label: 'Away',      ringColor: 'ring-amber-500/20' },
  offline:   { color: 'bg-slate-500',  label: 'Offline',   ringColor: 'ring-slate-500/20' },
};

const navItems = [
  { name: 'Activity Feed',   href: '/dashboard',   icon: Bell },
  { name: 'Workspaces',      href: '/workspace',   icon: Grid },
  { name: 'Direct Hub',      href: '/chat',        icon: MessageSquare },
  { name: 'Calendar',        href: '/calendar',     icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [presence, setPresence] = useState<Presence>('available');
  const [showPresenceMenu, setShowPresenceMenu] = useState(false);
  const presenceRef = useRef<HTMLDivElement>(null);

  // Close presence menu on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (presenceRef.current && !presenceRef.current.contains(e.target as Node)) {
        setShowPresenceMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <aside className="hidden md:flex w-20 bg-slate-950/80 border-r border-slate-900 flex-col items-center justify-between py-6 h-screen fixed left-0 top-0 z-40 shrink-0 select-none backdrop-blur-xl">
      {/* Top: Branding / Logo */}
      <div className="flex flex-col items-center gap-6 shrink-0 w-full">
        <Link href="/dashboard" className="group relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/10 hover:scale-105 active:scale-95 transition-all duration-300 border border-indigo-400/20">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-slate-950 font-bold">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900/95 border border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-200 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-2xl">
            AeroMeet Control
          </div>
        </Link>
        <div className="w-8 h-[1px] bg-slate-900" />
      </div>

      {/* Middle: Navigation Items */}
      <nav className="flex-1 flex flex-col items-center gap-5 w-full px-2 pt-4">
        {navItems.map(({ name, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={name}
              href={href}
              className="group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300"
            >
              <div
                className={cn(
                  'w-full h-full rounded-xl flex items-center justify-center transition-all duration-300 relative border border-transparent',
                  active
                    ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 hover:border-slate-800'
                )}
              >
                <Icon size={20} className={cn(active ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200')} />
                {active && (
                  <span className="absolute left-[-8px] top-1/4 bottom-1/4 w-[3px] bg-cyan-400 rounded-r-md shadow-[0_0_8px_#06b6d4]" />
                )}
              </div>
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900/95 border border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-200 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-2xl">
                {name}
              </div>
            </Link>
          );
        })}
        {user?.email === 'aksbasg@gmail.com' && (
          <Link
            href="/admin"
            className="group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300"
          >
            <div
              className={cn(
                'w-full h-full rounded-xl flex items-center justify-center transition-all duration-300 relative border border-transparent',
                pathname.startsWith('/admin')
                  ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 hover:border-slate-800'
              )}
            >
              <ShieldCheck size={20} className={pathname.startsWith('/admin') ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'} />
              {pathname.startsWith('/admin') && (
                <span className="absolute left-[-8px] top-1/4 bottom-1/4 w-[3px] bg-cyan-400 rounded-r-md shadow-[0_0_8px_#06b6d4]" />
              )}
            </div>
            {/* Tooltip */}
            <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900/95 border border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-200 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-2xl">
              Admin Console
            </div>
          </Link>
        )}
      </nav>

      {/* Bottom: Settings & Profile */}
      <div className="flex flex-col items-center gap-5 w-full px-2 shrink-0">
        <div className="w-8 h-[1px] bg-slate-900" />
        
        {/* Settings */}
        <Link
          href="/settings"
          className="group relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300"
        >
          <div
            className={cn(
              'w-full h-full rounded-xl flex items-center justify-center transition-all duration-300 relative border border-transparent',
              pathname.startsWith('/settings')
                ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)] font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 hover:border-slate-800'
            )}
          >
            <Settings size={20} className={pathname.startsWith('/settings') ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'} />
            {pathname.startsWith('/settings') && (
              <span className="absolute left-[-8px] top-1/4 bottom-1/4 w-[3px] bg-cyan-400 rounded-r-md shadow-[0_0_8px_#06b6d4]" />
            )}
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-900/95 border border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-200 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-2xl">
            Settings
          </div>
        </Link>

        {/* User Profile */}
        <div className="relative" ref={presenceRef}>
          <button
            onClick={() => setShowPresenceMenu(v => !v)}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-slate-900/40 border border-transparent hover:border-slate-800 transition-all duration-200 cursor-pointer relative"
            title={`Status: ${presenceConfig[presence].label}`}
          >
            <div className="relative">
              <Avatar name={user?.name || 'U'} src={user?.avatarUrl} size="sm" className="ring-1 ring-white/10" />
              {/* Presence dot */}
              <span className={cn(
                'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-slate-950 ring-2',
                presenceConfig[presence].color,
                presenceConfig[presence].ringColor
              )} />
            </div>
          </button>

          {/* Presence Dropdown (Floats to the right / above) */}
          {showPresenceMenu && (
            <div className="absolute bottom-2 left-16 w-52 bg-slate-905/95 border border-slate-850 rounded-xl shadow-2xl p-2 z-50 animate-fadeIn backdrop-blur-md">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 px-2.5 py-1.5 border-b border-slate-850/50 mb-1">Set Presence</p>
              {(Object.entries(presenceConfig) as [Presence, { color: string; label: string }][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setPresence(key); setShowPresenceMenu(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-800/50 text-left transition-all duration-150 cursor-pointer border border-transparent hover:border-slate-800/20',
                    presence === key && 'bg-slate-900 border-slate-800'
                  )}
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.color)} />
                  <span className="text-xs text-slate-350">{cfg.label}</span>
                  {presence === key && <span className="ml-auto text-cyan-400 text-[10px] font-bold">✓</span>}
                </button>
              ))}
              <div className="border-t border-slate-850/50 mt-1.5 pt-1.5">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-500/10 text-left text-rose-400 hover:text-rose-300 transition-all duration-150 cursor-pointer"
                >
                  <LogOut size={13} className="shrink-0" />
                  <span className="text-xs font-semibold">Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;