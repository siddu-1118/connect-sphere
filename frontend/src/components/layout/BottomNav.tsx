'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bell, Grid, MessageSquare, Clock, Video 
} from 'lucide-react';
import { cn } from '../../lib/utils';

export function BottomNav() {
  const pathname = usePathname();

  const mainItems = [
    { 
      name: 'Activity', 
      href: '/dashboard', 
      icon: Bell,
      activeColor: 'text-primary'
    },
    { 
      name: 'Workspaces', 
      href: '/workspace', 
      icon: Grid,
      activeColor: 'text-primary'
    },
    { 
      name: 'Direct Chat', 
      href: '/chat', 
      icon: MessageSquare,
      activeColor: 'text-secondary-glow'
    },
    { 
      name: 'Calendar', 
      href: '/calendar', 
      icon: Clock,
      activeColor: 'text-secondary-glow'
    },
    { 
      name: 'Meet Now', 
      href: '/room/instant/join', 
      icon: Video,
      activeColor: 'text-primary'
    },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] h-14 bg-[#111827]/75 border border-white/10 backdrop-blur-3xl rounded-full flex items-center justify-around z-50 px-3 shadow-[0_0_30px_rgba(16,185,129,0.12)] md:hidden transition-all duration-200">
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
              "p-2.5 rounded-full transition-all duration-200 group-active:scale-90",
              isActive ? "bg-[#10B981]/15 text-[#10B981]" : "text-slate-400 group-hover:text-slate-200"
            )}>
              <Icon className="w-4 h-4" />
            </div>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
