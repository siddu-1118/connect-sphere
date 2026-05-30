'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MessageSquare, Users, Calendar, Phone, FileText, Settings, X, Terminal, HelpCircle } from 'lucide-react';

interface CommandSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandSearch({ isOpen, onClose }: CommandSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commandList = [
    { name: 'Go to Chat', description: 'Open your direct messages', href: '/chat', icon: MessageSquare },
    { name: 'Go to Teams', description: 'Browse your workspaces and channels', href: '/teams', icon: Users },
    { name: 'Go to Calendar', description: 'Schedule or join events', href: '/calendar', icon: Calendar },
    { name: 'Go to Calls', description: 'Dial numbers or view call logs', href: '/phone', icon: Phone },
    { name: 'Go to Notes', description: 'Manage your text notes', href: '/notes', icon: FileText },
    { name: 'Go to Settings', description: 'Configure preferences', href: '/settings', icon: Settings },
  ];

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const filteredCommands = commandList.filter(
    (cmd) =>
      cmd.name.toLowerCase().includes(query.toLowerCase()) ||
      cmd.description.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (href: string) => {
    router.push(href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4 transition-all duration-200">
      <div
        ref={modalRef}
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-[#E0E0E0] dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-slideUp"
      >
        {/* Search Input Box */}
        <div className="flex items-center gap-3 px-4 border-b border-[#E0E0E0] dark:border-slate-800">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search (e.g. chat, teams)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-4 bg-transparent text-sm text-[#242424] dark:text-slate-100 placeholder:text-slate-450 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-1.5 font-mono text-[10px] font-medium text-slate-400">
            ESC
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-[#242424] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Options List */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
              <HelpCircle className="w-8 h-8 text-slate-400" />
              <span>No command paths matched your search query.</span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Navigation Shortcuts
              </div>
              {filteredCommands.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.name}
                    onClick={() => handleSelect(cmd.href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs text-slate-600 dark:text-slate-300 hover:bg-[#5B5FC7]/10 hover:text-[#5B5FC7] dark:hover:text-white transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-500 group-hover:bg-[#5B5FC7] group-hover:text-white transition-all shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[#242424] dark:text-slate-100 group-hover:text-[#5B5FC7] dark:group-hover:text-[#7b7fd7]">
                        {cmd.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {cmd.description}
                      </div>
                    </div>
                    <Terminal className="w-3.5 h-3.5 text-slate-350 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footnote */}
        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/40 border-t border-[#E0E0E0] dark:border-slate-800 text-[10px] text-slate-400 flex justify-between items-center">
          <span>Search or navigate instantly across ConnectSphere.</span>
          <span>Press <kbd className="font-mono bg-slate-200 dark:bg-slate-900 px-1 py-0.5 rounded text-[9px]">Enter</kbd> to select</span>
        </div>
      </div>
    </div>
  );
}
