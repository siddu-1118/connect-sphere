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
      activeColor: 'text-[#5B5FC7] dark:text-[#7b7fd7]'
    },
    { 
      name: 'Workspaces', 
      href: '/workspace', 
      icon: Grid,
      activeColor: 'text-[#5B5FC7] dark:text-[#7b7fd7]'
    },
    { 
      name: 'Direct Chat', 
      href: '/chat', 
      icon: MessageSquare,
      activeColor: 'text-cyan-400'
    },
    { 
      name: 'Calendar', 
      href: '/calendar', 
      icon: Clock,
      activeColor: 'text-cyan-400'
    },
    { 
      name: 'Meet Now', 
      href: '/room/instant/join', 
      icon: Video,
      activeColor: 'text-cyan-400'
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-950/90 border-t border-slate-900/60 backdrop-blur-lg flex items-center justify-around z-40 px-2 lg:hidden pb-safe transition-colors duration-200">
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
              "p-1 rounded-lg transition-all duration-200 group-active:scale-90",
              isActive ? item.activeColor : "text-slate-500 group-hover:text-slate-350"
            )}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-wider mt-0.5 transition-colors duration-200",
              isActive ? item.activeColor : "text-slate-500 group-hover:text-slate-350"
            )}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNav;
