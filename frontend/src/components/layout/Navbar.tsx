'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, Menu, Search, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import Avatar from '../ui/Avatar';

interface NavbarProps {
  onMenuToggle?: () => void;
  onSearchClick?: () => void;
}

export function Navbar({ onMenuToggle, onSearchClick }: NavbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 border-b border-[#E0E0E0] dark:border-slate-900 bg-white/95 dark:bg-slate-950/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-40 px-4 md:px-6 flex items-center justify-between text-[#242424] dark:text-slate-100 transition-colors duration-200">
      
      {/* Left side: Brand Logo */}
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-[#10B981] hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all lg:hidden"
            aria-label="Toggle Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <Link href="/dashboard" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#10B981] to-[#10B981] flex items-center justify-center shadow-lg shadow-[#10B981]/20 group-hover:scale-105 transition-all">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-black tracking-tighter text-[#10B981] dark:text-white bg-clip-text hidden sm:inline">
            AeroMeet
          </span>
        </Link>
      </div>

      {/* Middle: Command Search Entry Center Bar */}
      <div className="flex-1 max-w-lg mx-6 hidden md:block">
        <button
          onClick={onSearchClick}
          className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 text-xs transition-all text-left"
        >
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span>Search or type a command...</span>
          </div>
          <kbd className="inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-1.5 font-mono text-[9px] font-medium text-slate-400">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Mobile Search Icon Button */}
      <button
        onClick={onSearchClick}
        className="p-2 rounded-lg text-slate-400 hover:text-[#10B981] hover:bg-slate-100 dark:hover:bg-white/5 md:hidden active:scale-95"
        aria-label="Search"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Right side: Tools & Profile */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle Switch */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-slate-400 hover:text-[#10B981] hover:bg-slate-100 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-650" />
          )}
        </button>

        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden lg:inline text-xs font-semibold text-slate-500 dark:text-slate-400">
              Welcome, <span className="text-[#10B981] dark:text-slate-200 font-bold">{user.name.split(' ')[0]}</span>
            </span>
            <Link href="/settings" aria-label="Go to settings">
              <Avatar
                name={user.name}
                src={user.avatarUrl}
                size="sm"
                className="hover:ring-2 hover:ring-[#10B981]/50 hover:scale-102 transition-all cursor-pointer border border-[#E0E0E0] dark:border-slate-800"
              />
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

export default Navbar;