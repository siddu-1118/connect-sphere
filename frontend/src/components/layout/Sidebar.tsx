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

      <aside className="w-[60px] bg-[#141422] border-r border-white/[0.06] flex flex-col items-center py-2 gap-0 h-screen fixed left-0 top-0 z-40 shrink-0 select-none">

        {/* Logo mark */}
        <Link href="/dashboard" className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B5FC7] to-[#22d3ee] shadow-lg mb-1 shrink-0 hover:scale-105 transition-transform">
          <span className="text-white font-black text-[11px] tracking-tight leading-none">CS</span>
        </Link>

        {/* Search button */}
        <button
          onClick={onSearchClick}
          className="flex flex-col items-center justify-center w-full py-2 gap-0.5 text-slate-500 hover:text-slate-200 transition-colors group mb-1"
          title="Search (Ctrl+K)"
        >
          <div className="w-9 h-8 rounded-xl flex items-center justify-center group-hover:bg-white/5 transition-colors">
            <Search size={17} />
          </div>
          <span className="text-[8.5px] font-medium text-slate-600 group-hover:text-slate-400">Search</span>
        </button>

        {/* Meet Now quick action */}
        <Link
          href="/room/instant/join"
          className="flex flex-col items-center justify-center w-full py-2 gap-0.5 text-slate-500 hover:text-[#2D8CFF] transition-colors group mb-2"
          title="Start instant meeting"
        >
          <div className="w-9 h-8 rounded-xl flex items-center justify-center group-hover:bg-[#2D8CFF]/10 transition-colors">
            <Video size={17} />
          </div>
          <span className="text-[8.5px] font-medium text-slate-600 group-hover:text-[#2D8CFF]">Meet</span>
        </Link>

        {/* Divider */}
        <div className="w-8 h-px bg-white/[0.06] mb-2" />

        {/* Nav items */}
        <nav className="flex-1 flex flex-col items-center gap-0 w-full overflow-y-auto scrollbar-none">
          {navItems.map(({ name, href, icon: Icon, badge }) => {
            const active = pathname === href || (href !== '/' && pathname.startsWith(href));
            return (
              <Link
                key={name}
                href={href}
                onClick={onClose}
                className={cn(
                  'relative flex flex-col items-center justify-center w-full py-[9px] gap-0.5 cursor-pointer group transition-colors duration-100',
                  active ? 'text-white' : 'text-slate-500 hover:text-slate-100'
                )}
                title={name}
              >
                {/* Active accent bar */}
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-[#5B5FC7] rounded-r-full" />
                )}

                {/* Icon container */}
                <div className={cn(
                  'relative w-9 h-8 rounded-xl flex items-center justify-center transition-all duration-100',
                  active ? 'bg-[#5B5FC7]/20' : 'group-hover:bg-white/[0.07]'
                )}>
                  <Icon
                    size={18}
                    className={cn(active ? 'text-[#818cf8]' : 'text-slate-500 group-hover:text-slate-200')}
                  />
                  {/* Unread badge */}
                  {badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 shadow-sm">
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span className={cn(
                  'text-[8.5px] font-medium tracking-tight truncate max-w-[52px] text-center leading-tight',
                  active ? 'text-[#818cf8]' : 'text-slate-600 group-hover:text-slate-400'
                )}>
                  {name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom utilities */}
        <div className="flex flex-col items-center gap-0.5 pt-2 border-t border-white/[0.06] w-full">
          {/* Settings */}
          <Link
            href="/settings"
            className={cn(
              'flex flex-col items-center justify-center w-full py-2 gap-0.5 group transition-colors',
              pathname.startsWith('/settings') ? 'text-white' : 'text-slate-500 hover:text-slate-200'
            )}
            title="Settings"
          >
            <div className={cn(
              'w-9 h-8 rounded-xl flex items-center justify-center transition-colors',
              pathname.startsWith('/settings') ? 'bg-[#5B5FC7]/20' : 'group-hover:bg-white/[0.07]'
            )}>
              <Settings size={17} className={pathname.startsWith('/settings') ? 'text-[#818cf8]' : ''} />
            </div>
            <span className="text-[8.5px] font-medium text-slate-600 group-hover:text-slate-400">Settings</span>
          </Link>

          {/* User avatar + presence */}
          <div className="relative mb-1" ref={presenceRef}>
            <button
              onClick={() => setShowPresenceMenu(v => !v)}
              className="flex items-center justify-center w-9 h-9 rounded-full ring-2 ring-white/10 hover:ring-[#5B5FC7]/60 transition-all cursor-pointer overflow-hidden"
              title={`Presence: ${presenceConfig[presence].label}`}
            >
              <Avatar name={user?.name || 'U'} src={user?.avatarUrl} size="sm" />
            </button>

            {/* Presence ring indicator */}
            <span className={cn(
              'absolute bottom-0 right-0 w-[11px] h-[11px] rounded-full border-2 border-[#141422]',
              presenceConfig[presence].color
            )} />

            {/* Presence dropdown */}
            {showPresenceMenu && (
              <div className="absolute bottom-12 left-10 bg-[#252540] border border-white/10 rounded-2xl shadow-2xl p-1.5 w-48 z-50 animate-fadeIn">
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
                    {presence === key && <span className="ml-auto text-[#818cf8] text-[10px]">✓</span>}
                  </button>
                ))}
                <div className="border-t border-white/[0.06] mt-1 pt-1">
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-red-500/10 text-left transition-colors"
                  >
                    <span className="text-xs text-red-400">Sign out</span>
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