'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Video, MessageSquare, Calendar, Edit3, FileText, FolderOpen, Film, Phone, Columns, Users, Settings, LogOut, ChevronUp, Circle, ShieldCheck
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
  { name: 'Dashboard',   href: '/dashboard',   icon: LayoutGrid },
  { name: 'Meet',        href: '/meet',        icon: Video },
  { name: 'Chat',        href: '/chat',        icon: MessageSquare },
  { name: 'Calendar',    href: '/calendar',    icon: Calendar },
  { name: 'Whiteboards', href: '/whiteboards', icon: Edit3 },
  { name: 'Notes',       href: '/notes',       icon: FileText },
  { name: 'Files',       href: '/files',       icon: FolderOpen },
  { name: 'Clips',       href: '/clips',       icon: Film },
  { name: 'Phone',       href: '/phone',       icon: Phone },
  { name: 'Workspace',   href: '/workspace',   icon: Columns },
  { name: 'Room',        href: '/room',        icon: Users },
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
    <aside className="hidden md:flex w-20 bg-white border-r border-slate-250/80 flex-col items-center justify-between py-4 h-screen fixed left-0 top-0 z-40 shrink-0 select-none shadow-sm">
      {/* Top: Branding / Logo */}
      <div className="flex flex-col items-center gap-4 shrink-0 w-full">
        <Link href="/dashboard" className="group relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-[0_4px_12px_rgba(99,102,241,0.12)] hover:scale-105 active:scale-95 transition-all duration-300 border border-slate-100 flex items-center justify-center bg-white relative">
            <img src="/logo.png" alt="AeroMeet Logo" className="absolute w-[180%] h-[180%] max-w-none object-cover" style={{ top: '-18%' }} />
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
            AeroMeet
          </div>
        </Link>
        <div className="w-8 h-[1px] bg-slate-200" />
      </div>

      {/* Middle: Navigation Items */}
      <nav className="flex-1 flex flex-col items-center gap-3 w-full px-2 pt-2 overflow-y-auto scrollbar-thin">
        {navItems.map(({ name, href, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          return (
            <Link
              key={name}
              href={href}
              className="group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300 shrink-0"
            >
              <div
                className={cn(
                  'w-full h-full rounded-xl flex items-center justify-center transition-all duration-300 relative border border-transparent',
                  active
                    ? 'text-indigo-600 bg-indigo-50 border-indigo-100 shadow-[0_2px_10px_rgba(99,102,241,0.06)] font-bold'
                    : 'text-slate-450 hover:text-indigo-600 hover:bg-slate-50 hover:border-slate-100'
                )}
              >
                <Icon size={18} className={cn(active ? 'text-indigo-600' : 'text-slate-450 group-hover:text-indigo-600')} />
                {active && (
                  <span className="absolute left-[-8px] top-1/4 bottom-1/4 w-[3px] bg-indigo-600 rounded-r-md shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
                )}
              </div>
              {/* Tooltip */}
              <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
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
                  ? 'text-cyan-600 bg-cyan-50 border-cyan-100 shadow-[0_2px_10px_rgba(6,182,212,0.06)] font-bold'
                  : 'text-slate-450 hover:text-cyan-600 hover:bg-slate-50 hover:border-slate-100'
              )}
            >
              <ShieldCheck size={20} className={pathname.startsWith('/admin') ? 'text-cyan-600' : 'text-slate-450 group-hover:text-cyan-600'} />
              {pathname.startsWith('/admin') && (
                <span className="absolute left-[-8px] top-1/4 bottom-1/4 w-[3px] bg-cyan-600 rounded-r-md shadow-[0_0_8px_rgba(6,182,212,0.3)]" />
              )}
            </div>
            {/* Tooltip */}
            <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
              Admin Console
            </div>
          </Link>
        )}
      </nav>

      {/* Bottom: Settings & Profile */}
      <div className="flex flex-col items-center gap-4 w-full px-2 shrink-0">
        <div className="w-8 h-[1px] bg-slate-200" />
        
        {/* Settings */}
        <Link
          href="/settings"
          className="group relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-300"
        >
          <div
            className={cn(
              'w-full h-full rounded-xl flex items-center justify-center transition-all duration-300 relative border border-transparent',
              pathname.startsWith('/settings')
                ? 'text-indigo-600 bg-indigo-50 border-indigo-100 shadow-[0_2px_10px_rgba(99,102,241,0.06)] font-bold'
                : 'text-slate-450 hover:text-indigo-600 hover:bg-slate-50 hover:border-slate-100'
            )}
          >
            <Settings size={18} className={pathname.startsWith('/settings') ? 'text-indigo-600' : 'text-slate-450 group-hover:text-indigo-600'} />
            {pathname.startsWith('/settings') && (
              <span className="absolute left-[-8px] top-1/4 bottom-1/4 w-[3px] bg-indigo-600 rounded-r-md shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
            )}
          </div>
          {/* Tooltip */}
          <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-700 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2 transition-all duration-200 whitespace-nowrap z-50 shadow-lg">
            Settings
          </div>
        </Link>

        {/* User Profile */}
        <div className="relative" ref={presenceRef}>
          <button
            onClick={() => setShowPresenceMenu(v => !v)}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all duration-200 cursor-pointer relative"
            title={`Status: ${presenceConfig[presence].label}`}
          >
            <div className="relative">
              <Avatar name={user?.name || 'U'} src={user?.avatarUrl} size="sm" className="ring-1 ring-slate-100" />
              {/* Presence dot */}
              <span className={cn(
                'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-[3px] border-white ring-1 ring-slate-100',
                presenceConfig[presence].color,
                presenceConfig[presence].ringColor
              )} />
            </div>
          </button>

          {/* Presence Dropdown (Floats to the right / above) */}
          {showPresenceMenu && (
            <div className="absolute bottom-2 left-16 w-52 bg-white border border-slate-200 rounded-xl shadow-2xl p-2 z-50 animate-fadeIn">
              <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-2.5 py-1.5 border-b border-slate-100 mb-1">Set Presence</p>
              {(Object.entries(presenceConfig) as [Presence, { color: string; label: string }][]).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => { setPresence(key); setShowPresenceMenu(false); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-slate-50 text-left transition-all duration-150 cursor-pointer border border-transparent hover:border-slate-100',
                    presence === key && 'bg-indigo-50/50 border-indigo-100 text-indigo-650'
                  )}
                >
                  <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.color)} />
                  <span className="text-xs text-slate-600">{cfg.label}</span>
                  {presence === key && <span className="ml-auto text-indigo-600 text-[10px] font-bold">✓</span>}
                </button>
              ))}
              <div className="border-t border-slate-100 mt-1.5 pt-1.5">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-50 text-left text-rose-600 hover:text-rose-700 transition-all duration-150 cursor-pointer"
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