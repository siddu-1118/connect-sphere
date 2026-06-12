'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Video,
  Plus,
  Calendar,
  Users,
  Clock,
  Search,
  Wifi,
  Shield,
  Zap,
  ChevronDown,
  BellOff,
  Tv,
  Copy,
  Check,
  CalendarX,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Avatar from '@/components/ui/Avatar';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Calendar states
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState<string | null>(null);

  // User meetings state
  const [meetingsList, setMeetingsList] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    async function loadMeetings() {
      try {
        const res = await api.get('/meetings');
        if (res.data.success) {
          setMeetingsList(res.data.meetings || []);
        }
      } catch (err) {
        console.error('Error fetching user meetings:', err);
      }
    }
    loadMeetings();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    async function loadCalendar() {
      try {
        const fromDate = new Date();
        fromDate.setHours(0, 0, 0, 0);
        const toDate = new Date();
        toDate.setHours(23, 59, 59, 999);

        const res = await api.get('/calendar', {
          params: {
            from: fromDate.toISOString(),
            to: toDate.toISOString(),
          },
        });
        if (res.data.success) {
          const mapped = (res.data.events || []).map((evt: any) => ({
            ...evt,
            start: evt.start || evt.startsAt,
            end: evt.end || evt.endsAt,
            summary: evt.summary || evt.title,
            meetLink: evt.meetLink || (evt.meeting ? `/room/${evt.meeting.code}` : undefined),
          }));
          setCalendarEvents(mapped);
        } else {
          setCalendarError(res.data.error || 'Failed to fetch calendar');
        }
      } catch (err) {
        console.error('Error fetching calendar:', err);
        setCalendarError('Failed to retrieve agenda events');
      } finally {
        setCalendarLoading(false);
      }
    }
    loadCalendar();
  }, [user]);

  // State controls for modals & dropdowns
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showNewMeetingMenu, setShowNewMeetingMenu] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Input states
  const [joinCode, setJoinCode] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [meetingTitle, setMeetingTitle] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  const newMeetingRef = useRef<HTMLDivElement>(null);

  // Close new meeting dropdown on click outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (newMeetingRef.current && !newMeetingRef.current.contains(e.target as Node)) {
        setShowNewMeetingMenu(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Format code inputs (e.g. ABC-DEF-GHI)
  const formatCodeInput = (val: string) => {
    let clean = val.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (clean.length > 3 && clean.length <= 6) {
      clean = clean.slice(0, 3) + '-' + clean.slice(3);
    } else if (clean.length > 6) {
      clean = clean.slice(0, 3) + '-' + clean.slice(3, 6) + '-' + clean.slice(6, 9);
    }
    return clean.slice(0, 11);
  };

  // Instant meeting start
  const startInstantMeeting = () => {
    const code = Math.random().toString(36).slice(2, 11);
    router.push(`/meet/preview/${code}`);
  };

  // Create meeting for later
  const createMeetingLater = () => {
    const code = Math.random().toString(36).slice(2, 11);
    const link = `${window.location.origin}/meet/preview/${code}`;
    setGeneratedLink(link);
    setShowNewMeetingMenu(false);
    setShowLinkModal(true);
  };

  // Copy link utility
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Join meeting handler
  const handleJoinMeeting = () => {
    if (!joinCode.trim()) return;
    const clean = joinCode.trim().replace(/[^a-zA-Z0-9]/g, '');
    router.push(`/meet/preview/${clean}`);
  };

  // Share screen handler
  const handleShareScreen = () => {
    if (!shareCode.trim()) return;
    const clean = shareCode.trim().replace(/[^a-zA-Z0-9]/g, '');
    router.push(`/meet/preview/${clean}?share=true`);
  };

  // Schedule meeting handler
  const handleScheduleMeeting = () => {
    if (!meetingTitle.trim() || !scheduleDateTime) return;
    // Just close and reset for now as it's UI/UX mock database behavior
    setShowScheduleModal(false);
    setMeetingTitle('');
    setScheduleDateTime('');
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-800 overflow-hidden font-outfit relative">
      
      {/* Background Cinematic Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[380px] h-[380px] bg-indigo-500/2 rounded-full blur-[130px] -z-10 pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[5%] w-[450px] h-[450px] bg-indigo-500/2 rounded-full blur-[150px] -z-10 pointer-events-none" />

      {/* Top App Bar */}
      <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-100 z-10 select-none shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          {/* Quick Search Bar */}
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 focus-within:border-indigo-500 focus-within:bg-white rounded-full w-full max-w-sm transition-all duration-300 group">
            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input 
              className="bg-transparent border-none text-xs text-slate-700 w-full outline-none placeholder:text-slate-400 focus:ring-0" 
              placeholder="Search or enter commands..." 
              type="text"
            />
          </div>
        </div>

        {/* User Summary & Header Actions */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowScheduleModal(true)}
            className="hidden sm:flex items-center gap-2 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs transition-all duration-200 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.1)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          >
            <Plus className="w-3.5 h-3.5" />
            Schedule Sync
          </button>
          
          <div className="h-5 w-[1px] bg-slate-200 hidden sm:block" />
          
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-full py-1.5 pl-3 pr-1.5 select-none shrink-0">
            <div className="text-right leading-none hidden xs:block">
              <p className="text-xs font-bold text-slate-700">{(user?.name || 'Explorer').split(' ')[0]}</p>
              <span className="text-[9px] text-indigo-650 font-semibold tracking-wider flex items-center justify-end gap-1 mt-0.5">
                <span className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                Active
              </span>
            </div>
            <Avatar name={user?.name || 'U'} src={user?.avatarUrl} size="sm" className="border border-indigo-500/20 ring-1 ring-indigo-500/10" />
          </div>
        </div>
      </header>

      {/* Main Two-Panel Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* LEFT/CENTER WING: Action & Agenda */}
        <section className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 md:p-8 flex flex-col space-y-8 select-none">
          <div className="max-w-5xl w-full mx-auto flex-1 flex flex-col space-y-8">
            
            {/* Header Greeting Display */}
            <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white border border-slate-100 rounded-3xl relative overflow-hidden shadow-sm">
              <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/10 to-transparent" />
              <div>
                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                  {new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight mt-1">
                  Welcome back, {user?.name || 'User'}
                </h1>
                <p className="text-xs text-slate-500 mt-1 font-medium">
                  Start a video call, join a room, or manage your scheduled events.
                </p>
              </div>
              
              <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3 shrink-0 self-start md:self-auto">
                <Avatar name={user?.name || 'User'} src={user?.avatarUrl} size="md" className="border border-indigo-500/25 shadow-sm" />
                <div className="text-left font-outfit">
                  <p className="text-xs font-bold text-slate-700">{user?.name || 'User'}</p>
                  <p className="text-[10px] text-indigo-650 font-semibold tracking-wide flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-550 status-pulse" />
                    Focused Session
                  </p>
                </div>
              </div>
            </div>

            {/* ACTION QUARTET GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
              
              {/* 1. New Meeting - Solid Indigo Theme */}
              <div 
                ref={newMeetingRef}
                className="bg-indigo-600 text-white shadow-[0_4px_12px_rgba(99,102,241,0.15)] hover:shadow-[0_6px_20px_rgba(99,102,241,0.25)] hover:scale-[1.02] transition-all duration-300 rounded-2xl p-5 flex flex-col justify-between h-[135px] cursor-pointer relative overflow-hidden group border border-transparent"
                onClick={() => setShowNewMeetingMenu(prev => !prev)}
              >
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="flex items-start justify-between w-full">
                  <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 text-white flex items-center justify-center group-hover:bg-white group-hover:text-indigo-600 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all duration-300">
                    <Video size={18} className="stroke-[2.5]" />
                  </div>
                  <ChevronDown size={14} className={cn("text-white/80 group-hover:text-white transition-all duration-300", showNewMeetingMenu && "rotate-180")} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-wider">Start Host</h3>
                  <p className="text-[10px] text-white/70 mt-1 truncate">Instant collab session</p>
                </div>

                {/* Dropdown Menu */}
                {showNewMeetingMenu && (
                  <div className="absolute top-16 left-3 right-3 bg-white border border-slate-200 rounded-xl shadow-xl p-1 z-35 animate-fadeIn">
                    <button
                      onClick={(e) => { e.stopPropagation(); startInstantMeeting(); }}
                      className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                    >
                      Start instant meet
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); createMeetingLater(); }}
                      className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer mt-0.5"
                    >
                      Get join link for later
                    </button>
                  </div>
                )}
              </div>

              {/* 2. Join Meeting */}
              <div 
                onClick={() => setShowJoinModal(true)}
                className="bg-white border border-slate-200 hover:border-indigo-500/40 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 rounded-2xl p-5 flex flex-col justify-between h-[135px] cursor-pointer relative overflow-hidden group"
              >
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-indigo-600 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
                  <Users size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Join Room</h3>
                  <p className="text-[10px] text-slate-450 mt-1 truncate">Enter meeting details</p>
                </div>
              </div>

              {/* 3. Schedule Meeting */}
              <div 
                onClick={() => setShowScheduleModal(true)}
                className="bg-white border border-slate-200 hover:border-indigo-500/40 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 rounded-2xl p-5 flex flex-col justify-between h-[135px] cursor-pointer relative overflow-hidden group"
              >
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-indigo-600 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
                  <Calendar size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Schedule</h3>
                  <p className="text-[10px] text-slate-450 mt-1 truncate">Plan a synchronization</p>
                </div>
              </div>

              {/* 4. Share Screen */}
              <div 
                onClick={() => setShowShareModal(true)}
                className="bg-white border border-slate-200 hover:border-indigo-500/40 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-300 rounded-2xl p-5 flex flex-col justify-between h-[135px] cursor-pointer relative overflow-hidden group"
              >
                <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-r from-indigo-600 to-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all duration-300">
                  <Tv size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">Share Screen</h3>
                  <p className="text-[10px] text-slate-455 mt-1 truncate">Present in meeting room</p>
                </div>
              </div>

            </div>

            {/* AGENDA TIMELINE CONTAINER */}
            <div className="flex-1 flex flex-col min-h-[320px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Upcoming Events</h2>
                {calendarEvents.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 text-[9px] font-bold">
                    {calendarEvents.length} Sync{calendarEvents.length > 1 ? 's' : ''} Today
                  </span>
                )}
              </div>
              
              {calendarLoading ? (
                <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                  <div className="w-8 h-8 rounded-full border-2 border-t-indigo-600 border-slate-200 animate-spin" />
                  <p className="text-xs text-slate-500 mt-3 font-semibold">Retrieving your Google Calendar agenda...</p>
                </div>
              ) : calendarError ? (
                <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-3 animate-pulse">
                    <CalendarX className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-slate-700 font-bold text-sm tracking-tight">Calendar Sync Required</h3>
                  <p className="text-slate-500 text-xs mt-1.5 max-w-[280px] leading-relaxed">
                    {calendarError === 'Google Calendar not connected' 
                      ? 'Please sign in with Google to synchronize your daily calendar agenda.'
                      : 'We were unable to load your calendar events. Make sure your Google Auth client is configured with offline calendar scopes.'}
                  </p>
                </div>
              ) : calendarEvents.length === 0 ? (
                /* Premium Empty Stage Panel */
                <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/2 to-transparent pointer-events-none" />
                  
                  {/* Visual Calendar off illustration */}
                  <div className="relative mb-6 select-none">
                    {/* Glowing background */}
                    <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-2xl scale-75 animate-pulse" />
                    
                    {/* Visual container */}
                    <div className="w-20 h-20 rounded-full border border-slate-200 flex items-center justify-center bg-slate-50 shadow-sm relative z-10">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500/10 to-indigo-500/20 border border-indigo-500/20 flex items-center justify-center shadow-sm text-indigo-500">
                        <CalendarX className="w-6 h-6 text-indigo-500" />
                      </div>
                    </div>
                  </div>

                  <h3 className="text-slate-700 font-bold text-base tracking-tight">Your schedule is clear today.</h3>
                  <p className="text-slate-455 text-xs mt-2 max-w-[280px] leading-relaxed">
                    Enjoy your focused flow time! You don't have any sync sessions scheduled.
                  </p>

                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="mt-6 flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 shadow-md hover:scale-[1.03] active:scale-[0.98] cursor-pointer focus:outline-none border-0"
                  >
                    <Plus size={14} className="stroke-[2.5] text-white" />
                    Schedule a Meeting
                  </button>
                </div>
              ) : (
                /* Dynamic Calendar Agenda Timeline */
                <div className="flex-1 bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-y-auto max-h-[350px] scrollbar-thin">
                  <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/2 to-transparent pointer-events-none" />
                  <div className="relative pl-6 border-l border-slate-200 space-y-6">
                    {calendarEvents.map((event: any) => {
                      const startTime = new Date(event.start);
                      const endTime = new Date(event.end);
                      const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      
                      return (
                        <div key={event.id} className="relative group text-left">
                          {/* Timeline node */}
                          <div className="absolute -left-[30px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 border-2 border-white group-hover:bg-indigo-400 transition-colors shadow-[0_0_8px_#6366f1]" />
                          
                          <div className="bg-slate-55/60 border border-slate-100 hover:border-slate-200 rounded-2xl p-4 transition-all hover:scale-[1.005]">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <span className="text-[9px] font-mono font-bold text-indigo-600 bg-indigo-500/5 px-2 py-0.5 rounded-md border border-indigo-500/10 uppercase tracking-wider flex items-center gap-1.5 w-fit">
                                  <Clock className="w-2.5 h-2.5" />
                                  {timeStr}
                                </span>
                                <h3 className="text-sm font-bold text-slate-750 tracking-tight mt-2">{event.summary}</h3>
                                {event.description && (
                                  <p className="text-slate-500 text-xs mt-1 line-clamp-2 leading-relaxed">{event.description}</p>
                                )}
                                {event.location && (
                                  <span className="text-[10px] text-slate-655 block mt-2">📍 {event.location}</span>
                                )}
                              </div>
                              {event.meetLink && (
                                <a
                                  href={event.meetLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
                                >
                                  Join Call
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Nominal Status Stats Bar */}
            <div className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm select-none">
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 status-pulse shadow-[0_0_8px_#6366f1]" />
                  <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">All Systems Nominal</span>
                </div>
                <div className="hidden sm:block h-4 w-[1px] bg-slate-200" />
                <div className="flex items-center gap-1.5 text-slate-455">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-semibold tracking-wide">Secure Cryptographic Link</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-slate-455 tracking-wider uppercase">Region: Global Edge</span>
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
              </div>
            </div>

          </div>
        </section>

        {/* RIGHT WING: Profile & Summary Panel */}
        <section className="w-full lg:w-[320px] xl:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col h-auto lg:h-full overflow-y-auto select-none">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile</h2>
          </div>

          <div className="p-5 flex flex-col gap-6">
            {/* User Info Details */}
            <div className="flex flex-col items-center text-center p-5 bg-slate-50 border border-slate-200/60 rounded-2xl">
              <Avatar name={user?.name || 'User'} src={user?.avatarUrl} size="lg" className="border-2 border-indigo-500/20 shadow-sm mb-3 animate-fadeIn" />
              <h3 className="text-sm font-bold text-slate-850">{user?.name || 'User'}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 break-all leading-normal font-mono">{user?.email || 'user@company.com'}</p>
            </div>

            {/* Quick Preferences */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Quick Preferences</h3>
              <div className="space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl p-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Desktop Alerts</span>
                  <div className="w-8 h-4 rounded-full bg-indigo-600 flex items-center px-[2px] cursor-pointer"><div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5" /></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Email Updates</span>
                  <div className="w-8 h-4 rounded-full bg-indigo-600 flex items-center px-[2px] cursor-pointer"><div className="w-3.5 h-3.5 rounded-full bg-white translate-x-3.5" /></div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Mobile Push</span>
                  <div className="w-8 h-4 rounded-full bg-slate-200 flex items-center px-[2px] cursor-pointer"><div className="w-3.5 h-3.5 rounded-full bg-white" /></div>
                </div>
              </div>
            </div>

            {/* Recent Activity (styled from past meetings) */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-150 text-[9px] font-bold text-slate-500">
                  {meetingsList.length} Total
                </span>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
                {meetingsList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-6 text-center bg-slate-50/50 border border-slate-100 rounded-2xl select-none">
                    <BellOff className="w-4 h-4 text-slate-400 mb-1" />
                    <h3 className="text-slate-500 font-bold text-[10px]">No recent activity</h3>
                  </div>
                ) : (
                  meetingsList.slice(0, 5).map(meeting => {
                    const date = new Date(meeting.createdAt || Date.now());
                    const formattedDate = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
                    return (
                      <div key={meeting.id} className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl flex flex-col gap-1.5 text-left hover:border-slate-200 transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-indigo-650 font-mono">{meeting.code}</span>
                          <span className="text-[8px] text-slate-400">{formattedDate}</span>
                        </div>
                        <h4 className="text-[10px] font-bold text-slate-750 truncate">{meeting.title}</h4>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>
        </section>

      </div>

      {/* ── CUSTOM MOCKUP LIGHT-THEME MODAL DIALOGS ── */}

      {/* 1. Schedule Meeting Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
            
            <button 
              onClick={() => { setShowScheduleModal(false); setMeetingTitle(''); setScheduleDateTime(''); }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X size={16} />
            </button>

            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Schedule a Sync
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Meeting Title</label>
                <input
                  value={meetingTitle}
                  onChange={e => setMeetingTitle(e.target.value)}
                  placeholder="Enter collaborative title..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all font-outfit"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduleDateTime}
                  onChange={e => setScheduleDateTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 transition-all font-outfit"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => { setShowScheduleModal(false); setMeetingTitle(''); setScheduleDateTime(''); }} 
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-600 transition-all cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleMeeting}
                disabled={!meetingTitle.trim() || !scheduleDateTime}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_2px_10px_rgba(99,102,241,0.15)] border-0"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Join Meeting Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-left">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            
            <button 
              onClick={() => { setShowJoinModal(false); setJoinCode(''); }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X size={16} />
            </button>

            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Join a Room
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Meeting Code</label>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(formatCodeInput(e.target.value))}
                  placeholder="EX: ABC-DEF-GHI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold tracking-widest text-indigo-650 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all text-center uppercase font-outfit"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => { setShowJoinModal(false); setJoinCode(''); }} 
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-600 transition-all cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleJoinMeeting}
                disabled={joinCode.replace(/[^a-zA-Z0-9]/g, '').length < 9}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_2px_10px_rgba(99,102,241,0.15)] border-0"
              >
                Join Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Share Screen Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-left">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            
            <button 
              onClick={() => { setShowShareModal(false); setShareCode(''); }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X size={16} />
            </button>

            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Tv className="w-4 h-4 text-indigo-600" />
              Share Screen
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1.5 block">Meeting Code</label>
                <input
                  value={shareCode}
                  onChange={e => setShareCode(formatCodeInput(e.target.value))}
                  placeholder="EX: ABC-DEF-GHI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold tracking-widest text-indigo-650 placeholder:text-slate-400 outline-none focus:border-indigo-500 transition-all text-center uppercase font-outfit"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => { setShowShareModal(false); setShareCode(''); }} 
                className="flex-1 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-600 transition-all cursor-pointer bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleShareScreen}
                disabled={shareCode.replace(/[^a-zA-Z0-9]/g, '').length < 9}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer shadow-[0_2px_10px_rgba(99,102,241,0.15)] border-0"
              >
                Share Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Link Modal (Created for Later) */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative text-left">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
            
            <button 
              onClick={() => { setShowLinkModal(false); setGeneratedLink(''); }}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer border-0 bg-transparent"
            >
              <X size={16} />
            </button>

            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-650" />
              Meeting Created
            </h2>
            <p className="text-slate-500 text-xs mb-5">
              Copy the meeting link below and share it with participants. They can join directly from their browser.
            </p>

            <div className="flex gap-2">
              <input
                readOnly
                value={generatedLink}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-850 outline-none select-all font-mono"
              />
              <button
                onClick={copyToClipboard}
                className="p-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-150 transition-all cursor-pointer flex items-center justify-center shrink-0 w-11 h-11"
                title="Copy Link"
              >
                {copied ? <Check size={16} className="text-indigo-650" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="flex justify-end mt-6">
              <button 
                onClick={() => { setShowLinkModal(false); setGeneratedLink(''); }} 
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-0"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}