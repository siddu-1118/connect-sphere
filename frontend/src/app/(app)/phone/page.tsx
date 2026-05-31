'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Voicemail,
  Users,
  Hash,
  Phone,
  Video,
  PhoneOff,
  Search,
  Delete,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { User } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type PhoneTab = 'history' | 'voicemail' | 'contacts' | 'dialpad';

interface SubTab {
  id: PhoneTab;
  label: string;
  Icon: React.ElementType;
}

const SUB_TABS: SubTab[] = [
  { id: 'history', label: 'History', Icon: Clock },
  { id: 'voicemail', label: 'Voicemail', Icon: Voicemail },
  { id: 'contacts', label: 'Contacts', Icon: Users },
  { id: 'dialpad', label: 'Dial Pad', Icon: Hash },
];

// ─── Dial Pad Keys ────────────────────────────────────────────────────────────

const DIAL_KEYS: { digit: string; letters: string }[] = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

// ─── Presence Dot ─────────────────────────────────────────────────────────────

function PresenceDot({ presence }: { presence?: 'online' | 'away' | 'offline' }) {
  const color =
    presence === 'online'
      ? 'bg-emerald-400'
      : presence === 'away'
      ? 'bg-yellow-400'
      : 'bg-slate-500';
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${color} shrink-0`}
    />
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function ContactSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-3 bg-[#191f31] rounded-2xl p-3">
          <div className="w-10 h-10 rounded-xl bg-white/5 animate-pulse shrink-0" />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 rounded bg-white/5 animate-pulse w-1/2" />
            <div className="h-2.5 rounded bg-white/5 animate-pulse w-1/3" />
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
            <div className="w-8 h-8 rounded-lg bg-white/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 px-6">
      <div className="w-20 h-20 rounded-3xl bg-[#191f31] border border-white/[0.06] flex items-center justify-center shadow-inner">
        <Icon size={36} className="text-slate-600" />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-slate-300">{title}</p>
        <p className="text-sm text-slate-500 mt-1 max-w-xs">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── History Panel ────────────────────────────────────────────────────────────

function HistoryPanel() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
          Recent Calls
        </h2>
      </div>
      <EmptyState
        icon={PhoneOff}
        title="No call history yet"
        subtitle="Calls you make or receive will appear here"
      />
    </div>
  );
}

// ─── Voicemail Panel ──────────────────────────────────────────────────────────

function VoicemailPanel() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500">
          Voicemail
        </h2>
      </div>
      <EmptyState
        icon={Voicemail}
        title="No voicemails"
        subtitle="Voicemails from missed calls appear here"
      />
    </div>
  );
}

// ─── Contacts Panel ───────────────────────────────────────────────────────────

function ContactsPanel() {
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchContacts = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const url = q.trim() ? `/users?search=${encodeURIComponent(q.trim())}` : '/users';
      const res = await api.get(url);
      setContacts(res.data.users ?? res.data ?? []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchContacts(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchContacts]);

  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-3 shrink-0">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
          Contacts
        </h2>
        <div className="flex items-center gap-2 bg-white/5 border border-white/[0.06] rounded-xl px-3 py-2">
          <Search size={14} className="text-slate-500 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {loading ? (
          <ContactSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts found"
            subtitle={search ? `No results for "${search}"` : 'No contacts are available'}
          />
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 bg-[#191f31] border border-white/[0.06] rounded-2xl px-4 py-3 hover:bg-[#2a2a4a] transition-colors group"
              >
                <Avatar name={contact.name} src={contact.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-100 truncate">
                      {contact.name}
                    </span>
                    <PresenceDot />
                  </div>
                  <span className="text-xs text-slate-500 truncate block">{contact.email}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition-colors cursor-pointer">
                    <Phone size={15} />
                  </button>
                  <button className="p-2 rounded-xl text-slate-400 hover:text-[#10B981] hover:bg-white/5 transition-colors cursor-pointer">
                    <Video size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Dial Pad Panel ───────────────────────────────────────────────────────────

function DialPadPanel() {
  const router = useRouter();
  const [number, setNumber] = useState('');

  const pressKey = (digit: string) => {
    setNumber((prev) => (prev.length < 15 ? prev + digit : prev));
  };

  const backspace = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  const clearAll = () => {
    setNumber('');
  };

  const handleCall = () => {
    router.push('/room/instant/join');
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 overflow-y-auto">
      <div className="w-full max-w-[300px] flex flex-col items-center gap-6">
        {/* Number display */}
        <div className="w-full flex items-center justify-center gap-3 min-h-[48px]">
          <span
            className="text-3xl font-mono tracking-widest text-slate-100 flex-1 text-center truncate"
          >
            {number || (
              <span className="text-slate-600 text-xl font-normal not-italic">
                Enter a number
              </span>
            )}
          </span>
          {number && (
            <button
              onClick={backspace}
              className="text-slate-500 hover:text-slate-200 transition-colors cursor-pointer p-1"
              title="Backspace"
            >
              <Delete size={20} />
            </button>
          )}
        </div>

        {/* Keys grid */}
        <div className="grid grid-cols-3 gap-3 w-full">
          {DIAL_KEYS.map(({ digit, letters }) => (
            <button
              key={digit}
              onClick={() => pressKey(digit)}
              className="flex flex-col items-center justify-center bg-[#191f31] hover:bg-[#2a2a4a] border border-white/[0.06] rounded-2xl py-4 transition-colors cursor-pointer select-none active:scale-95 active:bg-[#10B981]/20"
            >
              <span className="text-xl font-semibold text-slate-100 leading-none">
                {digit}
              </span>
              {letters && (
                <span className="text-[9px] font-medium tracking-widest text-slate-500 mt-1 uppercase">
                  {letters}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Action row: Clear + Call + (spacer) */}
        <div className="grid grid-cols-3 gap-3 w-full items-center">
          {/* Clear button (left) */}
          <div className="flex justify-center">
            {number.length > 0 && (
              <button
                onClick={clearAll}
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/[0.06] text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer text-xs font-medium"
              >
                CLR
              </button>
            )}
          </div>

          {/* Call button (center) */}
          <div className="flex justify-center">
            <button
              onClick={handleCall}
              className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 shadow-lg shadow-emerald-900/50 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            >
              <Phone size={24} className="text-white" />
            </button>
          </div>

          {/* Spacer (right) */}
          <div />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PhonePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<PhoneTab>('history');
  const router = useRouter();

  const handleMakeCall = () => {
    setActiveTab('dialpad');
  };

  const renderPanel = () => {
    switch (activeTab) {
      case 'history':
        return <HistoryPanel />;
      case 'voicemail':
        return <VoicemailPanel />;
      case 'contacts':
        return <ContactsPanel />;
      case 'dialpad':
        return <DialPadPanel />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full bg-[#111827]">
      {/* ── Left Sub-Panel ─────────────────────────────────────────────────────── */}
      <div className="w-[260px] shrink-0 bg-[#0B0F17] border-r border-white/[0.06] flex flex-col">
        {/* Header */}
        <div className="px-4 pt-5 pb-4">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500">
            Calls &amp; Phone
          </span>
        </div>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <Avatar name={user.name} src={user.avatarUrl} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">{user.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-500">Available</span>
              </div>
            </div>
          </div>
        )}

        <div className="h-px bg-white/[0.06] mx-4 mb-3" />

        {/* Sub-tab pills */}
        <nav className="flex flex-col gap-1 px-3 flex-1">
          {SUB_TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#10B981]/20 text-[#10B981]'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                }`}
              >
                <Icon
                  size={16}
                  className={isActive ? 'text-[#10B981]' : 'text-slate-500'}
                />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Make a call CTA */}
        <div className="px-3 pb-5 pt-3">
          <button
            onClick={handleMakeCall}
            className="w-full bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-xl px-4 py-2.5 text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-indigo-900/30"
          >
            <Phone size={15} />
            Make a call
          </button>
        </div>
      </div>

      {/* ── Right Panel ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {renderPanel()}
      </div>
    </div>
  );
}
