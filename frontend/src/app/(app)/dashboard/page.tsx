'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Plus,
  Calendar,
  Monitor,
  Users,
  Clock,
  ChevronRight,
  MessageSquare,
  FileText,
  Bell,
  Star,
  Hash,
  ArrowRight,
  Mic,
  PhoneCall,
  LayoutGrid,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import Avatar from '@/components/ui/Avatar';

/* ── Types ── */
interface Meeting {
  id: string;
  title: string;
  scheduledAt: string;
  hostName?: string;
  participantCount?: number;
  meetingCode?: string;
}

/* ── Helpers ── */
function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}
function isWithinMinutes(iso: string, mins: number) {
  const diff = new Date(iso).getTime() - Date.now();
  return diff >= 0 && diff <= mins * 60 * 1000;
}

/* ── New Meeting Modal ── */
function NewMeetingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setLoading(true);
    try {
      await api.post('/meetings', { title, scheduledAt: scheduledAt || new Date().toISOString() });
      onCreated();
      onClose();
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e1e35] border border-white/[0.08] rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-slate-100 mb-5">Schedule a Meeting</h2>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Meeting Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter meeting title…"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-[#5B5FC7]/60 focus:bg-white/[0.07] transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1.5 block">Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-[#5B5FC7]/60 focus:bg-white/[0.07] transition-all [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/[0.08] text-sm text-slate-400 hover:bg-white/[0.05] transition-all">Cancel</button>
          <button
            onClick={submit}
            disabled={loading || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-[#5B5FC7] hover:bg-[#6c70e0] text-sm text-white font-semibold disabled:opacity-50 transition-all"
          >
            {loading ? 'Creating…' : 'Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Dashboard ── */
export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const fetchMeetings = useCallback(async () => {
    setLoadingMeetings(true);
    try {
      const res = await api.get('/meetings');
      const data = res.data as Meeting[];
      const upcoming = data
        .filter(m => new Date(m.scheduledAt) >= new Date())
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      setMeetings(upcoming);
    } catch {
      setMeetings([]);
    } finally {
      setLoadingMeetings(false);
    }
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const startInstantMeeting = () => {
    const code = Math.random().toString(36).slice(2, 11);
    router.push(`/meet/preview/${code}`);
  };

  /* ── Quick Actions (Zoom-style) ── */
  const quickActions = [
    {
      icon: Video,
      label: 'New Meeting',
      desc: 'Start an instant meeting',
      color: '#FF6B35',
      bg: 'from-[#FF6B35]/20 to-[#FF6B35]/5',
      border: 'border-[#FF6B35]/20',
      action: startInstantMeeting,
    },
    {
      icon: Plus,
      label: 'Join',
      desc: 'Enter a meeting ID',
      color: '#2D8CFF',
      bg: 'from-[#2D8CFF]/20 to-[#2D8CFF]/5',
      border: 'border-[#2D8CFF]/20',
      action: () => router.push('/meet/join'),
    },
    {
      icon: Calendar,
      label: 'Schedule',
      desc: 'Plan a future meeting',
      color: '#5B5FC7',
      bg: 'from-[#5B5FC7]/20 to-[#5B5FC7]/5',
      border: 'border-[#5B5FC7]/20',
      action: () => setShowScheduleModal(true),
    },
    {
      icon: Monitor,
      label: 'Share Screen',
      desc: 'Present your display',
      color: '#10B981',
      bg: 'from-[#10B981]/20 to-[#10B981]/5',
      border: 'border-[#10B981]/20',
      action: startInstantMeeting,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-[#1e1e35] overflow-y-auto">

      {/* ── Top header bar (Teams-style) ── */}
      <div className="shrink-0 h-14 bg-[#1a1a2e] border-b border-white/[0.06] flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-300">Home</span>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="flex items-center gap-2 bg-[#5B5FC7] hover:bg-[#6c70e0] text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all shadow-lg shadow-[#5B5FC7]/20"
        >
          <Calendar className="w-3.5 h-3.5" />
          New Meeting
        </button>
      </div>

      <div className="flex-1 p-6 space-y-6 max-w-5xl w-full mx-auto">

        {/* ── Greeting Banner (Teams-style) ── */}
        <div className="relative bg-gradient-to-br from-[#252540] to-[#1a1a35] border border-white/[0.06] rounded-2xl px-8 py-6 overflow-hidden">
          {/* decorative glow */}
          <div className="absolute -top-8 -right-8 w-48 h-48 bg-[#5B5FC7]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-6 right-24 w-32 h-32 bg-[#2D8CFF]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#818cf8] uppercase tracking-widest mb-1">
                {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-2xl font-bold text-slate-100">
                {greeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {meetings.length > 0
                  ? `You have ${meetings.length} upcoming meeting${meetings.length > 1 ? 's' : ''}.`
                  : 'Your schedule is clear today. Enjoy!'}
              </p>
            </div>
            <Avatar name={user?.name ?? 'U'} size="lg" />
          </div>
        </div>

        {/* ── Quick Actions (Zoom-style 4 cards) ── */}
        <div>
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map(({ icon: Icon, label, desc, color, bg, border, action }) => (
              <button
                key={label}
                onClick={action}
                className={`group flex flex-col items-start gap-3 p-5 bg-gradient-to-br ${bg} border ${border} rounded-2xl text-left hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer`}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}22` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-100 group-hover:text-white transition-colors">{label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Two column: Upcoming Meetings + Recent Activity ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

          {/* Upcoming Meetings (Teams-style) — 3 cols */}
          <div className="lg:col-span-3 bg-[#1a1a2e] border border-white/[0.06] rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#818cf8]" />
                <span className="text-sm font-semibold text-slate-200">Upcoming Meetings</span>
              </div>
              <button
                onClick={() => router.push('/calendar')}
                className="flex items-center gap-1 text-[11px] text-[#818cf8] hover:text-white transition-colors"
              >
                View calendar <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-white/[0.04]">
              {loadingMeetings ? (
                /* skeleton */
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 animate-pulse">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/[0.06] rounded-full w-3/4" />
                      <div className="h-2.5 bg-white/[0.04] rounded-full w-1/2" />
                    </div>
                    <div className="w-14 h-7 bg-white/[0.06] rounded-lg" />
                  </div>
                ))
              ) : meetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  {/* Illustrated calendar SVG */}
                  <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mb-4 opacity-60">
                    <rect x="8" y="12" width="48" height="44" rx="6" fill="#252540" stroke="#5B5FC7" strokeWidth="1.5" />
                    <rect x="8" y="12" width="48" height="14" rx="6" fill="#5B5FC7" opacity="0.3" />
                    <line x1="22" y1="8" x2="22" y2="18" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="42" y1="8" x2="42" y2="18" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" />
                    <circle cx="22" cy="38" r="3" fill="#5B5FC7" opacity="0.5" />
                    <circle cx="32" cy="38" r="3" fill="#5B5FC7" opacity="0.5" />
                    <circle cx="42" cy="38" r="3" fill="#10B981" />
                    <circle cx="22" cy="48" r="3" fill="#5B5FC7" opacity="0.5" />
                    <circle cx="32" cy="48" r="3" fill="#5B5FC7" opacity="0.5" />
                  </svg>
                  <p className="text-sm font-semibold text-slate-300">Your schedule is clear ✨</p>
                  <p className="text-xs text-slate-600 mt-1">Scheduled meetings will appear here.</p>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="mt-4 flex items-center gap-1.5 text-xs text-[#818cf8] hover:text-white border border-[#5B5FC7]/30 hover:border-[#5B5FC7]/60 px-4 py-2 rounded-lg transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Schedule a meeting
                  </button>
                </div>
              ) : (
                meetings.slice(0, 5).map(meeting => {
                  const soon = isWithinMinutes(meeting.scheduledAt, 10);
                  return (
                    <div
                      key={meeting.id}
                      className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.03] transition-colors group"
                    >
                      {/* Time block */}
                      <div className="shrink-0 w-12 text-center">
                        <p className="text-[10px] font-bold text-[#818cf8] uppercase">{formatDate(meeting.scheduledAt)}</p>
                        <p className="text-[13px] font-bold text-slate-200 mt-0.5">{formatTime(meeting.scheduledAt)}</p>
                      </div>
                      {/* Left accent */}
                      <div className="w-0.5 h-10 rounded-full shrink-0" style={{ background: soon ? '#FF6B35' : '#5B5FC7' }} />
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-100 truncate">{meeting.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {meeting.participantCount != null && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500">
                              <Users className="w-3 h-3" /> {meeting.participantCount}
                            </span>
                          )}
                          {soon && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-[#FF6B35] bg-[#FF6B35]/10 px-2 py-0.5 rounded-full">
                              <Zap className="w-2.5 h-2.5" /> Starting soon
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Join button */}
                      <button
                        onClick={() => router.push(`/meet/preview/${meeting.meetingCode ?? meeting.id}`)}
                        className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                          soon
                            ? 'bg-[#2D8CFF] hover:bg-[#1a7ae8] text-white shadow-lg shadow-[#2D8CFF]/20'
                            : 'bg-white/[0.06] hover:bg-white/[0.10] text-slate-300 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {soon ? 'Join Now' : 'Join'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right column — Teams Quick Access — 2 cols */}
          <div className="lg:col-span-2 space-y-4">

            {/* Personal meeting room card (Zoom-style) */}
            <div className="bg-gradient-to-br from-[#252540] to-[#1e1e38] border border-white/[0.06] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-[#FF6B35]/15 flex items-center justify-center">
                  <Video className="w-4 h-4 text-[#FF6B35]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">My Personal Room</p>
                  <p className="text-[10px] text-slate-500 font-mono">{user?.name?.toLowerCase().replace(/\s+/g, '.') ?? 'my-room'}</p>
                </div>
              </div>
              <button
                onClick={startInstantMeeting}
                className="w-full py-2 rounded-xl bg-[#FF6B35] hover:bg-[#e85d2a] text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
              >
                <Video className="w-3.5 h-3.5" /> Start Meeting
              </button>
            </div>

            {/* Teams-style quick links */}
            <div className="bg-[#1a1a2e] border border-white/[0.06] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Quick Access</span>
              </div>
              {[
                { icon: MessageSquare, label: 'Direct Messages', sub: 'Chat with teammates', route: '/chat', color: '#5B5FC7' },
                { icon: Hash, label: 'Teams & Channels', sub: 'Browse workspaces', route: '/workspace', color: '#818cf8' },
                { icon: PhoneCall, label: 'Make a Call', sub: 'Audio or video call', route: '/phone', color: '#10B981' },
                { icon: FileText, label: 'Recent Files', sub: 'Docs & attachments', route: '/files', color: '#F59E0B' },
                { icon: Star, label: 'Favorites', sub: 'Pinned conversations', route: '/chat', color: '#EC4899' },
              ].map(({ icon: Icon, label, sub, route, color }) => (
                <button
                  key={label}
                  onClick={() => router.push(route)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{label}</p>
                    <p className="text-[10px] text-slate-600 truncate">{sub}</p>
                  </div>
                  <ArrowRight className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Teams-style: What to try ── */}
        <div>
          <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">Explore AeroMeet</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: Mic,
                title: 'AI Noise Cancellation',
                desc: 'Crystal-clear audio in any environment.',
                color: '#5B5FC7',
              },
              {
                icon: Users,
                title: 'Breakout Rooms',
                desc: 'Split meetings into smaller groups.',
                color: '#2D8CFF',
              },
              {
                icon: Bell,
                title: 'Smart Notifications',
                desc: 'Get notified for what matters most.',
                color: '#10B981',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="flex items-start gap-3 p-4 bg-[#1a1a2e] border border-white/[0.06] rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{title}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ── Schedule Modal ── */}
      {showScheduleModal && (
        <NewMeetingModal
          onClose={() => setShowScheduleModal(false)}
          onCreated={fetchMeetings}
        />
      )}
    </div>
  );
}