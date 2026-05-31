'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Plus,
  Calendar,
  Users,
  Clock,
  ChevronRight,
  ArrowRight,
  Shield,
  Zap,
  Search,
  Wifi,
  FileText,
  Folder,
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
      <div className="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        <h2 className="text-lg font-bold text-slate-100 mb-5 font-outfit">Schedule a Sync</h2>
        <div className="space-y-4 font-outfit">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Meeting Title</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter meeting title…"
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5 block">Date & Time</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all [color-scheme:dark]"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6 font-outfit">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-slate-400 hover:bg-white/[0.03] transition-all">Cancel</button>
          <button
            onClick={submit}
            disabled={loading || !title.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-[#059669] text-sm text-slate-900 font-bold disabled:opacity-50 transition-all emerald-glow shadow-md"
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
  const [joinCodeInput, setJoinCodeInput] = useState('');

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

  const handleJoinByCode = () => {
    if (!joinCodeInput.trim()) return;
    let code = joinCodeInput.trim().replace(/[^a-zA-Z0-9]/g, '');
    router.push(`/meet/preview/${code}`);
  };

  // Format code input with dashes
  const handleInputChange = (val: string) => {
    let clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length > 3 && clean.length <= 6) {
      clean = clean.slice(0, 3) + '-' + clean.slice(3);
    } else if (clean.length > 6) {
      clean = clean.slice(0, 3) + '-' + clean.slice(3, 6) + '-' + clean.slice(6, 9);
    }
    setJoinCodeInput(clean.slice(0, 11));
  };

  return (
    <div className="flex flex-col h-full bg-[#0b0f17] text-slate-200 overflow-hidden font-outfit relative">
      
      {/* Background Glow Decors */}
      <div className="fixed top-[-10%] right-[-5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
      <div className="fixed bottom-[-5%] left-[20%] w-[300px] h-[300px] bg-secondary/5 rounded-full blur-[100px] -z-10 pointer-events-none"></div>

      {/* TopAppBar */}
      <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-surface-dim/70 backdrop-blur-md border-b border-white/5 shadow-sm z-10">
        <div className="flex items-center gap-4 flex-1">
          <div className="glass-panel flex items-center gap-3 px-4 py-2 rounded-full w-full max-w-md cyan-glow transition-all">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              className="bg-transparent border-none focus:ring-0 text-sm text-slate-200 w-full outline-none placeholder:text-slate-500" 
              placeholder="Search workspace..." 
              type="text"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center gap-1.5 px-4.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-full font-bold text-xs transition-all tracking-wide"
          >
            <Calendar className="w-3.5 h-3.5" />
            Schedule Sync
          </button>
          <div className="w-8 h-8 rounded-full overflow-hidden border border-primary/25">
            <Avatar name={user?.name ?? 'U'} src={user?.avatarUrl} size="sm" />
          </div>
        </div>
      </header>

      {/* Dashboard Body */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Greeting message */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 glass-panel rounded-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight mt-1">
                {greeting()}, {user?.name?.split(' ')[0] ?? 'Explorer'} 👋
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                {meetings.length > 0
                  ? `You have ${meetings.length} upcoming sync session${meetings.length > 1 ? 's' : ''} scheduled.`
                  : 'Your collaborative roadmap is clear. Enjoy the focus flow!'}
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl p-3 px-4">
              <Avatar name={user?.name ?? 'U'} src={user?.avatarUrl} size="md" />
              <div className="text-left font-outfit">
                <p className="text-xs font-bold text-slate-200">{user?.name ?? 'Felix Henderson'}</p>
                <p className="text-[10px] text-primary flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  Active status
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Meet Launcher Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Instant Meet card */}
            <div className="md:col-span-1 glass-panel rounded-2xl p-6 flex flex-col justify-between hover:border-primary/20 transition-all group">
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-1.5">Instant Sync</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">Start an unscheduled immersive session with your workspace team immediately.</p>
              </div>
              <button 
                onClick={startInstantMeeting}
                className="w-full h-12 bg-primary hover:bg-[#059669] text-slate-900 font-bold text-xs rounded-xl flex items-center justify-center gap-2 emerald-glow transition-all active:scale-[0.98]"
              >
                <Video className="w-4 h-4 text-slate-900" />
                Start Instant Meet
              </button>
            </div>

            {/* Join Room card */}
            <div className="md:col-span-2 glass-panel rounded-2xl p-6 flex flex-col justify-between hover:border-secondary/20 transition-all">
              <div>
                <h2 className="text-lg font-bold text-slate-100 mb-1.5">Join a Room</h2>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">Enter a 9-digit meeting code or personal room ID to join the digital call canvas.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 glass-panel bg-white/[0.02] border-white/10 rounded-xl px-4 py-2.5 cyan-glow transition-all">
                  <input 
                    value={joinCodeInput}
                    onChange={e => handleInputChange(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-base font-bold text-primary w-full outline-none placeholder:text-slate-600 uppercase tracking-wider" 
                    placeholder="Ex: ABC-123-XYZ" 
                    type="text"
                  />
                </div>
                <button 
                  onClick={handleJoinByCode}
                  disabled={!joinCodeInput.trim()}
                  className="h-12 px-8 bg-secondary hover:bg-secondary/80 disabled:opacity-40 text-slate-900 font-bold text-xs rounded-xl transition-all shadow-md active:scale-[0.98]"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Bento schedule + recent activity */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Upcoming schedule (Timeline) */}
            <div className="lg:col-span-5 glass-panel rounded-2xl flex flex-col">
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-100">Upcoming Sync Schedule</h3>
                <button 
                  onClick={() => router.push('/calendar')}
                  className="text-primary hover:underline text-xs font-semibold"
                >
                  View Calendar
                </button>
              </div>
              <div className="flex-1 p-6 space-y-6">
                {loadingMeetings ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="w-12 h-10 bg-white/[0.04] rounded-xl shrink-0" />
                      <div className="w-[2px] bg-white/[0.04] my-1" />
                      <div className="flex-1 space-y-2 py-0.5">
                        <div className="h-3.5 bg-white/[0.04] rounded w-3/4" />
                        <div className="h-2.5 bg-white/[0.03] rounded w-1/2" />
                      </div>
                    </div>
                  ))
                ) : meetings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <svg width="48" height="48" viewBox="0 0 64 64" fill="none" className="mb-3 opacity-30">
                      <rect x="8" y="12" width="48" height="44" rx="6" fill="#111827" stroke="#10B981" strokeWidth="1.5" />
                      <rect x="8" y="12" width="48" height="14" rx="6" fill="#10B981" opacity="0.15" />
                      <line x1="22" y1="8" x2="22" y2="18" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                      <line x1="42" y1="8" x2="42" y2="18" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <p className="text-xs font-bold text-slate-300">Your schedule is clear ✨</p>
                    <p className="text-[10px] text-slate-500 mt-1">Scheduled sessions will render here.</p>
                  </div>
                ) : (
                  meetings.slice(0, 3).map((meeting, idx) => {
                    const soon = isWithinMinutes(meeting.scheduledAt, 10);
                    return (
                      <div key={meeting.id} className="flex gap-4 group cursor-pointer" onClick={() => router.push(`/meet/preview/${meeting.meetingCode ?? meeting.id}`)}>
                        <div className="flex flex-col items-center shrink-0 w-12 text-center">
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wide">{formatDate(meeting.scheduledAt)}</span>
                          <span className="text-[13px] font-bold text-slate-100 mt-0.5">{formatTime(meeting.scheduledAt)}</span>
                        </div>
                        <div className="w-[2px] shrink-0 bg-white/15 my-1 group-hover:bg-primary transition-colors"></div>
                        <div className="flex-1 pb-1">
                          <h4 className="text-sm font-semibold text-slate-200 group-hover:text-primary transition-colors truncate">{meeting.title}</h4>
                          <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-1">
                            {soon ? (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-full">
                                <Zap className="w-2.5 h-2.5 animate-pulse" /> Starting soon
                              </span>
                            ) : (
                              <span>Synced Room</span>
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Recent activity grid */}
            <div className="lg:col-span-7 space-y-6">
              <div className="glass-panel rounded-2xl p-5 flex flex-col h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-100">Workspace Channels & Links</h3>
                  <span className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase">Quick Access</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  
                  {/* Notes Card */}
                  <div 
                    onClick={() => router.push('/notes')}
                    className="glass-panel bg-white/[0.02] p-4 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group border-white/5 border flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Notes</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-[#06B6D4] transition-colors">Product Roadmap V2</h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">Low latency audio modular architecture sync notes...</p>
                    </div>
                  </div>

                  {/* Folder Card */}
                  <div 
                    onClick={() => router.push('/files')}
                    className="glass-panel bg-white/[0.02] p-4 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group border-white/5 border flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Folder className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Files</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-primary transition-colors">Assets & Layouts</h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">12 design zips • Shared with facilitating teams</p>
                    </div>
                  </div>

                  {/* Teams Card */}
                  <div 
                    onClick={() => router.push('/workspace')}
                    className="glass-panel bg-white/[0.02] p-4 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group border-white/5 border flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Spaces</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-primary transition-colors">Interactive Spaces</h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">Jump into 2D isometric virtual room maps...</p>
                    </div>
                  </div>

                  {/* Quick Chat */}
                  <div 
                    onClick={() => router.push('/chat')}
                    className="glass-panel bg-white/[0.02] p-4 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer group border-white/5 border flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                        <Users className="w-4 h-4" />
                      </div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Directs</span>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-xs font-bold text-slate-200 group-hover:text-[#06B6D4] transition-colors">Collaborator Chat</h4>
                      <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">Direct message sync channels with workspace peers</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>

          </div>

          {/* System status stats bar */}
          <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border border-white/5">
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary status-pulse"></span>
                <span className="text-[11px] font-bold text-slate-300">All Systems Nominal</span>
              </div>
              <div className="hidden sm:block h-4 w-[1px] bg-white/10"></div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Wifi className="w-4 h-4" />
                <span className="text-[11px]">Secure Cryptographic Sync</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-semibold text-slate-500 tracking-wider uppercase">Region: Global US-EAST</span>
              <Shield className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>

        </div>
      </main>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <NewMeetingModal
          onClose={() => setShowScheduleModal(false)}
          onCreated={fetchMeetings}
        />
      )}
    </div>
  );
}