'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutGrid, Video, MessageSquare, Calendar, Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const mainItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutGrid },
    { name: 'Meet', href: '/meet', icon: Video },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[90%] max-w-[380px] h-14 bg-white/95 border border-slate-200 backdrop-blur-xl rounded-full flex items-center justify-around z-50 px-2.5 shadow-xl shadow-slate-200/50 md:hidden transition-all duration-200">
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
                ? "bg-indigo-50 text-indigo-600 border-indigo-100/50 shadow-[0_2px_8px_rgba(99,102,241,0.06)]" 
                : "text-slate-400 hover:text-indigo-600"
            )}>
              <Icon className="w-4 h-4" />
              {isActive && (
                <span className="absolute bottom-[2px] left-1/2 -translate-x-1/2 w-1 h-1 bg-indigo-600 rounded-full shadow-[0_0_4px_rgba(99,102,241,0.3)]" />
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
