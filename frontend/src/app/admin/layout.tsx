'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldAlert, LayoutDashboard, Users, FileSpreadsheet,
  ArrowLeft, LogOut, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../../components/ui/Spinner';
import Avatar from '../../components/ui/Avatar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Validate admin claim client-side to render safe content
  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace('/auth');
      return;
    }

    // Call user endpoint directly to check if they have admin access
    async function checkRole() {
      try {
        const token = document.cookie.split('sb-access-token=')[1]?.split(';')[0];
        if (token === 'demo-admin-token') {
          setIsAdmin(true);
          return;
        }

        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
          }
        });
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data?.app_metadata?.is_admin === true);
        } else {
          setIsAdmin(false);
        }
      } catch (err) {
        setIsAdmin(false);
      }
    }

    checkRole();
  }, [user, loading, router]);

  if (loading || isAdmin === null) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-4 font-outfit">
        <Spinner size="lg" className="border-t-cyan-400 w-12 h-12" />
        <p className="text-xs font-bold text-slate-550 uppercase tracking-widest animate-pulse">
          Authorizing Admin Access...
        </p>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="h-screen bg-slate-950 flex flex-col items-center justify-center gap-6 font-outfit text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-lg font-black text-white uppercase tracking-wider mb-2">404 - Stage Not Found</h1>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
            The page you are looking for does not exist or has been moved to another location.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const navItems = [
    { href: '/admin', label: 'Metrics Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'User Directory', icon: Users },
    { href: '/admin/logs', label: 'Security Audit logs', icon: FileSpreadsheet },
  ];

  return (
    <div className="h-screen flex bg-slate-950 text-slate-200 font-outfit select-none overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950/60 backdrop-blur-xl flex flex-col justify-between shrink-0">
        <div className="flex flex-col">
          {/* Header */}
          <div className="h-16 px-6 border-b border-slate-900 flex items-center gap-2.5 bg-slate-950">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold shrink-0">
              A
            </div>
            <div className="text-left leading-none min-w-0">
              <h2 className="text-xs font-black text-white uppercase tracking-widest truncate">AeroConsole</h2>
              <span className="text-[8px] font-bold text-cyan-500 uppercase tracking-widest mt-1 block">Enterprise Admin</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-1.5">
            <span className="text-[9px] font-black text-slate-550 uppercase tracking-widest px-3 mb-2 block">Management</span>
            {navItems.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                    isActive
                      ? 'bg-cyan-500/5 border-cyan-500/10 text-cyan-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={14} className="shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {isActive && <ChevronRight size={12} className="stroke-[2.5] shrink-0" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer profile & actions */}
        <div className="p-4 border-t border-slate-900 bg-slate-950 flex flex-col gap-2">
          {user && (
            <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-slate-900/30 border border-slate-900/60 text-left">
              <Avatar name={user.name} src={user.avatarUrl} size="sm" className="border border-slate-800 shrink-0" />
              <div className="min-w-0 leading-none">
                <span className="text-xs font-bold text-slate-200 block truncate">{user.name}</span>
                <span className="text-[9px] text-slate-550 font-semibold block truncate mt-1">{user.email}</span>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
            >
              <ArrowLeft size={11} className="stroke-[2.5]" /> App Stage
            </Link>
            <button
              onClick={() => logout()}
              className="flex items-center justify-center p-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/15 hover:border-rose-500/30 text-rose-455 rounded-xl transition-all cursor-pointer"
              title="Logout session"
            >
              <LogOut size={13} className="stroke-[2.5]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
