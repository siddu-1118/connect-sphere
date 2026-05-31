'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell, MessageSquare, Users, Calendar, Phone,
  FolderOpen, Film, PenTool, Settings, Search,
  Video, ChevronDown
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';
import { cn } from '../../lib/utils';

type Presence = 'available' | 'busy' | 'dnd' | 'away' | 'offline';

const presenceConfig: Record<Presence, { color: string; label: string }> = {
  available: { color: 'bg-green-500', label: 'Available' },
  busy:      { color: 'bg-red-500',   label: 'Busy' },
  dnd:       { color: 'bg-red-600',   label: 'Do not disturb' },
  away:      { color: 'bg-yellow-500',label: 'Away' },
  offline:   { color: 'bg-slate-500', label: 'Appear offline' },
};

const navItems = [
  { name: 'Activity',    href: '/dashboard',   icon: Bell,        badge: 0 },
  { name: 'Chat',        href: '/chat',         icon: MessageSquare, badge: 0 },
  { name: 'Teams',       href: '/workspace',    icon: Users,       badge: 0 },
  { name: 'Calendar',    href: '/calendar',     icon: Calendar,    badge: 0 },
  { name: 'Calls',       href: '/phone',        icon: Phone,       badge: 0 },
  { name: 'Files',       href: '/files',        icon: FolderOpen,  badge: 0 },
  { name: 'Clips',       href: '/clips',        icon: Film,        badge: 0 },
  { name: 'Whiteboard',  href: '/whiteboards',  icon: PenTool,     badge: 0 },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSearchClick?: () => void;
}

export function Sidebar({ isOpen, onClose, onSearchClick }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [presence, setPresence] = useState<Presence>('available');
  const [showPresenceMenu, setShowPresenceMenu] = useState(false);
  const presenceRef = useRef<HTMLDivElement>(null);

  // Close presence menu on outside click
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
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className="hidden md:flex w-[240px] bg-[#0c1324] border-r border-white/5 flex-col py-6 h-screen fixed left-0 top-0 z-40 shrink-0 select-none">
        
        {/* Brand/Logo Section */}
        <div className="px-6 mb-8 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(16,185,129,0.15)] group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[22px]">hub</span>
            </div>
            <div>
              <h1 className="font-outfit text-base font-bold text-slate-100 leading-none">AeroMeet</h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-semibold mt-1">Premium Sync</p>
            </div>
          </Link>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-none px-3">
          {navItems.map(({ name, href, icon: Icon, badge }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={name}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3.5 px-4.5 py-3 rounded-xl transition-all duration-200 group relative',
                  active
                    ? 'text-primary bg-primary/5 shadow-[0_0_15px_rgba(16,185,129,0.06)] border-l-4 border-primary font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                )}
                title={name}
              >
                <Icon
                  size={18}
                  className={cn(active ? 'text-primary' : 'text-slate-400 group-hover:text-slate-200')}
                />
                <span className="text-sm font-medium">{name}</span>
                {badge > 0 && (
                  <span className="ml-auto min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom utility & profile info */}
        <div className="flex flex-col gap-2 pt-4 border-t border-white/5 px-3 shrink-0">
          {/* Settings link */}
          <Link
            href="/settings"
            className={cn(
              'flex items-center gap-3.5 px-4.5 py-3 rounded-xl transition-all group',
              pathname.startsWith('/settings')
                ? 'text-primary bg-primary/5 border-l-4 border-primary font-bold'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            )}
            title="Settings"
          >
            <Settings size={18} className={pathname.startsWith('/settings') ? 'text-primary' : ''} />
            <span className="text-sm font-medium">Settings</span>
          </Link>

          {/* User profile with presence menu */}
          <div className="relative mt-2" ref={presenceRef}>
            <button
              onClick={() => setShowPresenceMenu(v => !v)}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/[0.03] transition-all border border-transparent hover:border-white/5 text-left cursor-pointer overflow-hidden"
              title={`Presence: ${presenceConfig[presence].label}`}
            >
              <div className="relative shrink-0">
                <Avatar name={user?.name || 'U'} src={user?.avatarUrl} size="sm" />
                {/* Presence dot */}
                <span className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-[10px] h-[10px] rounded-full border-2 border-[#0c1324]',
                  presenceConfig[presence].color
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'User'}</p>
                <p className="text-[9px] text-slate-500 truncate">{presenceConfig[presence].label}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {/* Presence status dropdown */}
            {showPresenceMenu && (
              <div className="absolute bottom-14 left-1 w-full bg-[#151b2d] border border-white/10 rounded-2xl shadow-2xl p-1.5 z-50 animate-fadeIn">
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500 px-2 py-1">Set status</p>
                {(Object.entries(presenceConfig) as [Presence, { color: string; label: string }][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => { setPresence(key); setShowPresenceMenu(false); }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-white/5 text-left transition-colors',
                      presence === key && 'bg-white/5'
                    )}
                  >
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.color)} />
                    <span className="text-xs text-slate-200">{cfg.label}</span>
                    {presence === key && <span className="ml-auto text-primary text-[10px]">✓</span>}
                  </button>
                ))}
                <div className="border-t border-white/[0.06] mt-1 pt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-red-500/10 text-left transition-colors"
                  >
                    <span className="text-xs text-red-450">Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;