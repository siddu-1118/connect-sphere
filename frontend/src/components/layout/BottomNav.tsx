'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell, Grid, MessageSquare, Clock, Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const mainItems = [
    { name: 'Activity', href: '/dashboard', icon: Bell },
    { name: 'Spaces', href: '/workspace', icon: Grid },
    { name: 'Chats', href: '/chat', icon: MessageSquare },
    { name: 'Calendar', href: '/calendar', icon: Clock },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] h-14 bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-full flex items-center justify-around z-50 px-2.5 shadow-2xl shadow-slate-950/50 md:hidden transition-all duration-200">
      {mainItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

        return (
          <Link
            key={item.name}
            href={item.href}
            className="flex flex-col items-center justify-center flex-1 h-full py-1 group transition-all"
          >
            <div className={cn(
              "p-2.5 rounded-full transition-all duration-150 relative active:scale-90 border border-transparent",
              isActive 
                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.1)]" 
                : "text-slate-400 hover:text-slate-200"
            )}>
              <Icon className="w-4 h-4" />
              {isActive && (
                <span className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_4px_#06b6d4]" />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
