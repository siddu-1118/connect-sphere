'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';
import Avatar from '../components/ui/Avatar';
import { Video, Calendar, Link as LinkIcon, HelpCircle, AlertCircle, Copy, Check, LogOut, Compass, X } from 'lucide-react';

// Abstract Premium SVGs customized for AeroMeet with Indigo and Cyan branding
const carouselSlides = [
  {
    title: 'Real-Time HD calling stage',
    description: 'Launch instant high-definition WebRTC video sessions with encrypted audio and peer-to-peer grids.',
    element: (
      <div className="w-full max-w-[340px] aspect-[4/3] bg-slate-950/80 rounded-2xl border border-white/[0.06] p-3 flex flex-col justify-between relative shadow-inner">
        {/* Call Grid */}
        <div className="grid grid-cols-2 gap-2 flex-grow">
          {/* Tile 1 */}
          <div className="bg-slate-900 rounded-xl border border-white/[0.04] p-2 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-1.5 right-1.5 px-1 py-0.5 rounded bg-black/60 text-[6px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-xs">
                SH
              </div>
            </div>
            <div className="text-[8px] font-bold text-slate-350">Sarah (Host)</div>
          </div>
          {/* Tile 2 */}
          <div className="bg-slate-900 rounded-xl border border-white/[0.04] p-2 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-blue-500/20 text-[6.5px] font-bold text-blue-400">
              SPEAKING
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-xs relative">
                AM
                <span className="absolute inset-0 rounded-full border border-cyan-500/50 animate-ping" />
              </div>
            </div>
            <div className="text-[8px] font-bold text-slate-350">Alex Miller</div>
          </div>
          {/* Tile 3 */}
          <div className="bg-slate-900 rounded-xl border border-white/[0.04] p-2 flex flex-col justify-between relative overflow-hidden">
            <div className="flex-grow flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-black text-xs">
                U
              </div>
            </div>
            <div className="text-[8px] font-bold text-slate-350">You (Muted)</div>
          </div>
          {/* Tile 4 */}
          <div className="bg-slate-900 rounded-xl border border-white/[0.04] p-2 flex flex-col justify-between relative overflow-hidden">
            <div className="flex-grow flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-black text-xs">
                BOT
              </div>
            </div>
            <div className="text-[8px] font-bold text-slate-350">AeroBot</div>
          </div>
        </div>
        {/* Controls */}
        <div className="flex items-center justify-center gap-2 mt-2 pt-2 border-t border-white/[0.04]">
          <div className="w-6.5 h-6.5 rounded-lg bg-slate-900 border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white cursor-pointer transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
          </div>
          <div className="w-6.5 h-6.5 rounded-lg bg-slate-900 border border-white/[0.06] flex items-center justify-center text-slate-500 hover:text-white cursor-pointer transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
          </div>
          <div className="w-6.5 h-6.5 rounded-lg bg-red-650 flex items-center justify-center text-white cursor-pointer transition-all hover:bg-red-700">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2 2m0 0l2 2m-2-2l-2 2m2-2l2-2M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5z"/></svg>
          </div>
        </div>
      </div>
    ),
  },
  {
    title: 'Collaborative Vector Sandbox',
    description: 'Sketch layout specs, pin sticky note diagrams, and draw vector shapes together on a shared canvas.',
    element: (
      <div className="w-full max-w-[340px] aspect-[4/3] bg-slate-950/80 rounded-2xl border border-white/[0.06] p-4 flex relative overflow-hidden shadow-inner bg-[radial-gradient(#1e293b_1px,transparent_1px)] bg-[size:15px_15px]">
        {/* Draw Shapes */}
        <div className="absolute top-6 left-10 w-12 h-12 rounded-full border border-cyan-400/60 flex items-center justify-center text-cyan-400 text-[8px] bg-cyan-400/[0.02]">Circle</div>
        <div className="absolute top-14 left-24 w-20 h-10 border border-indigo-400/65 flex items-center justify-center text-indigo-450 text-[8px] rounded-lg bg-indigo-500/[0.02]">Rectangle</div>
        
        {/* Sticky Note */}
        <div className="absolute top-4 right-8 w-22 bg-amber-400 p-2 rounded-lg shadow-lg rotate-3 text-slate-950 flex flex-col justify-between aspect-square">
          <p className="text-[7.5px] font-black leading-snug text-left text-slate-900">Design dynamic page styling today.</p>
          <div className="text-[5.5px] uppercase tracking-widest opacity-60 font-black border-t border-slate-950/10 pt-0.5 mt-0.5 text-left">Idea Note</div>
        </div>
        
        {/* Vector toolbar mockup */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 bg-slate-900 border border-white/[0.06] p-1 rounded-md flex flex-col gap-1 shadow-xl">
          <div className="w-4.5 h-4.5 rounded bg-indigo-500 flex items-center justify-center"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></div>
          <div className="w-4.5 h-4.5 rounded bg-transparent flex items-center justify-center text-slate-500"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg></div>
          <div className="w-4.5 h-4.5 rounded bg-transparent flex items-center justify-center text-slate-500"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></div>
        </div>
        
        {/* Collaborator Cursor */}
        <div className="absolute bottom-8 left-16 flex items-center gap-0.5">
          <svg className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400 rotate-45" viewBox="0 0 24 24"><path d="M12 2L2 22l10-6 10 6L12 2z"/></svg>
          <div className="px-1 py-0.2 rounded bg-cyan-400 text-[5px] text-slate-950 font-black uppercase">Sarah</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Organized Team Workspaces',
    description: 'Create customized team workspaces, structure channel orbits, and exchange real-time thread messages.',
    element: (
      <div className="w-full max-w-[340px] aspect-[4/3] bg-slate-950/80 rounded-2xl border border-white/[0.06] flex shadow-inner overflow-hidden text-left">
        {/* Sidebar Mock */}
        <div className="w-1/3 bg-slate-900 border-r border-white/[0.04] p-2 flex flex-col gap-1.5">
          <div className="h-4 bg-white/[0.03] rounded mb-1 flex items-center px-1 text-[7px] text-slate-500 font-bold uppercase tracking-wider">Channels</div>
          <div className="flex flex-col gap-0.5">
            <div className="h-5 rounded bg-[#5B5FC7]/20 border border-[#5B5FC7]/35 flex items-center px-1.5 text-[7px] font-semibold text-slate-200 gap-1 select-none">
              <span className="text-slate-400">#</span> general
            </div>
            <div className="h-5 rounded hover:bg-white/[0.02] flex items-center px-1.5 text-[7px] font-semibold text-slate-500 gap-1">
              <span className="text-slate-600">#</span> marketing
            </div>
            <div className="h-5 rounded hover:bg-white/[0.02] flex items-center px-1.5 text-[7px] font-semibold text-slate-500 gap-1">
              <span className="text-slate-600">#</span> design-system
            </div>
          </div>
        </div>
        {/* Chat Panel Mock */}
        <div className="flex-1 p-2 flex flex-col justify-between">
          {/* Messages */}
          <div className="flex flex-col gap-2">
            <div className="flex items-start gap-1">
              <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center text-[6px] text-indigo-400 font-black shrink-0">SH</div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5px] font-bold text-white leading-none">Sarah</span>
                  <span className="text-[5.5px] text-slate-500">12:34 PM</span>
                </div>
                <p className="text-[7.5px] text-slate-450 mt-0.5 leading-snug">Let's coordinate on the design spec!</p>
              </div>
            </div>
            <div className="flex items-start gap-1">
              <div className="w-4 h-4 rounded-full bg-cyan-500/20 flex items-center justify-center text-[6px] text-cyan-400 font-black shrink-0">AM</div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[7.5px] font-bold text-white leading-none">Alex</span>
                  <span className="text-[5.5px] text-slate-500">12:35 PM</span>
                </div>
                <p className="text-[7.5px] text-slate-450 mt-0.5 leading-snug">Sure! Pinned a sticky note in Whiteboard.</p>
              </div>
            </div>
          </div>
          {/* Input block */}
          <div className="bg-slate-900 border border-white/[0.06] rounded-lg p-1 flex items-center gap-1">
            <input type="text" disabled placeholder="Message #general..." className="w-full bg-transparent text-[7.5px] text-slate-500 placeholder-slate-700 outline-none" />
            <div className="w-3.5 h-3.5 rounded bg-[#5B5FC7] flex items-center justify-center text-white shrink-0"><svg className="w-2 h-2" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></div>
          </div>
        </div>
      </div>
    ),
  }
];

export default function AeroMeetLandingPage() {
  const router = useRouter();
  const { user, logout, loading } = useAuth();

  // Clock state
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // UI state
  const [meetingCode, setMeetingCode] = useState('');
  const [showNewMeetingDropdown, setShowNewMeetingDropdown] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [showAvatarMenu, setShowAvatarMenu] = useState(false);

  // Carousel slider state
  const [carouselIndex, setCarouselIndex] = useState(0);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const avatarMenuRef = useRef<HTMLDivElement>(null);

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dropdown dismiss helpers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowNewMeetingDropdown(false);
      }
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(e.target as Node)) {
        setShowAvatarMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartInstantMeeting = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    try {
      const response = await api.post('/meetings', { title: `${user.name}'s Meeting` });
      if (response.data.success) {
        const { code } = response.data.meeting;
        router.push(`/room/${code}/join`);
      }
    } catch (err) {
      console.error('Failed to create instant meeting', err);
    }
  };

  const handleCreateMeetingForLater = async () => {
    if (!user) {
      router.push('/auth');
      return;
    }
    try {
      const response = await api.post('/meetings', { title: `${user.name}'s Upcoming Meeting` });
      if (response.data.success) {
        const { code } = response.data.meeting;
        const link = `${window.location.origin}/room/${code}/join`;
        setGeneratedLink(link);
        setShowShareModal(true);
        setShowNewMeetingDropdown(false);
      }
    } catch (err) {
      console.error('Failed to pre-create meeting', err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleJoinClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingCode.trim()) return;
    
    let parsedCode = meetingCode.trim();
    if (parsedCode.includes('/')) {
      const parts = parsedCode.split('/');
      parsedCode = parts[parts.length - 1];
    }
    
    if (user) {
      router.push(`/room/${parsedCode}/join`);
    } else {
      router.push(`/auth?redirect=/room/${parsedCode}/join`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center font-sans">
        <div className="w-10 h-10 rounded-full border-4 border-t-cyan-400 border-slate-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-[#0a0d14] via-[#0B0F19] to-[#0f172a] text-slate-100 flex flex-col font-sans relative overflow-hidden select-none">
      
      {/* Background visual glows */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#5B5FC7]/10 blur-[140px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-20%] w-[50%] h-[50%] bg-[#22d3ee]/8 blur-[140px] rounded-full pointer-events-none" />

      {/* 1. Header Toolbar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-white/[0.06] bg-slate-950/30 backdrop-blur-xl z-20">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Compass className="w-4 h-4" />
          </div>
          <span className="text-lg font-medium tracking-tight text-slate-300 select-none">
            Aero<strong className="font-extrabold text-cyan-400">Meet</strong>
          </span>
        </div>

        {/* Right Info and Profile controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center text-xs text-slate-455 font-bold uppercase tracking-wider select-none">
            <span>{timeStr}</span>
            <span className="mx-2 text-slate-650">•</span>
            <span>{dateStr}</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-slate-900/60 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer select-none">
              <HelpCircle className="w-4 h-4" />
            </button>
            
            {user ? (
              <div className="relative" ref={avatarMenuRef}>
                <button 
                  onClick={() => setShowAvatarMenu(!showAvatarMenu)} 
                  className="focus:outline-none transition-transform hover:scale-105 active:scale-95 cursor-pointer ml-1"
                >
                  <Avatar name={user.name} size="sm" />
                </button>
                
                {/* Avatar context menu */}
                {showAvatarMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-2xl z-50 animate-fadeIn">
                    <div className="flex flex-col items-center border-b border-slate-850 pb-3 mb-3">
                      <Avatar name={user.name} size="lg" className="mb-2" />
                      <span className="text-sm font-semibold text-white">{user.name}</span>
                      <span className="text-xs text-slate-500 mt-0.5">{user.email}</span>
                    </div>
                    <button 
                      onClick={() => {
                        logout();
                        setShowAvatarMenu(false);
                      }} 
                      className="w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/auth">
                <button className="px-5 py-2 bg-[#5B5FC7] hover:bg-[#474aac] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow transition-all cursor-pointer">
                  Sign In
                </button>
              </Link>
            )}
          </div>

        </div>

      </header>

      {/* 2. Main Content Canvas */}
      <main className="flex-grow flex flex-col lg:flex-row items-center justify-center px-6 md:px-16 max-w-7xl mx-auto w-full gap-12 lg:gap-16 pt-8 pb-16 z-10">
        
        {/* Left Side: Onboarding meeting actions */}
        <div className="flex-1 space-y-6 max-w-lg w-full text-center lg:text-left">
          
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.08] text-[10px] font-semibold text-cyan-400 uppercase tracking-widest mb-2 shadow-inner">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            Active Session Sync Grid
          </div>

          <h1 className="text-4xl md:text-[50px] leading-[1.1] font-bold tracking-tight text-white select-none">
            Premium calling.<br />
            Now <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">effortless</span> for everyone.
          </h1>

          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-md font-light">
            Coordinate organizational workspaces, channel orbits, sketch ideas on collaborative whiteboards, and launch secure video sync stages on any device.
          </p>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4 relative">
            
            {/* New Meeting Dropdown button */}
            <div className="relative w-full sm:w-auto" ref={dropdownRef}>
              <button
                onClick={() => {
                  if (user) {
                    setShowNewMeetingDropdown(!showNewMeetingDropdown);
                  } else {
                    router.push('/auth');
                  }
                }}
                className="w-full sm:w-auto px-6 py-3.5 bg-[#5B5FC7] hover:bg-[#474aac] text-white text-xs font-bold uppercase tracking-wider rounded-full flex items-center justify-center gap-2 cursor-pointer shadow hover:shadow-lg transition-all select-none"
              >
                <Video className="w-4 h-4" />
                <span>New meeting</span>
              </button>

              {showNewMeetingDropdown && (
                <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2.5 z-40 animate-fadeIn">
                  <button 
                    onClick={handleCreateMeetingForLater}
                    className="w-full px-4 py-3 hover:bg-slate-850 text-left text-xs font-semibold text-slate-200 flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <LinkIcon className="w-4 h-4 text-cyan-400" />
                    <span>Create a meeting coordinates link</span>
                  </button>
                  
                  <button 
                    onClick={handleStartInstantMeeting}
                    className="w-full px-4 py-3 hover:bg-slate-850 text-left text-xs font-semibold text-slate-200 flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <Video className="w-4 h-4 text-indigo-400" />
                    <span>Start an instant meeting room</span>
                  </button>
                  
                  <button 
                    onClick={() => {
                      setShowNewMeetingDropdown(false);
                      router.push('/calendar');
                    }}
                    className="w-full px-4 py-3 hover:bg-slate-850 text-left text-xs font-semibold text-slate-200 flex items-center gap-3 transition-colors cursor-pointer"
                  >
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <span>Schedule in AeroMeet Calendar</span>
                  </button>
                </div>
              )}
            </div>

            {/* Joining field input */}
            <form onSubmit={handleJoinClick} className="w-full sm:w-auto flex items-center gap-2 flex-1 max-w-xs bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] focus-within:border-cyan-500/40 p-1.5 rounded-2xl transition-all shadow-inner">
              <div className="relative flex-1">
                <Video className="absolute left-3 top-3.5 w-4 h-4 text-slate-550 select-none" />
                <input
                  type="text"
                  placeholder="Enter room code or link"
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs bg-transparent focus:outline-none placeholder-slate-650 text-slate-250"
                />
              </div>

              <button
                type="submit"
                disabled={!meetingCode.trim()}
                className="text-xs font-black uppercase tracking-wider text-slate-950 bg-cyan-400 hover:bg-cyan-350 disabled:bg-slate-850 disabled:text-slate-600 px-5 py-3 rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed select-none shadow"
              >
                Join
              </button>
            </form>

          </div>

          <div className="border-t border-white/[0.04] pt-4 mt-6">
            <p className="text-xs text-slate-550 font-normal leading-relaxed">
              <span className="text-cyan-400">Secure Stage Infrastructure</span>. Fully encrypted P2P peer calls.
            </p>
          </div>

        </div>

        {/* Right Side: Showcase Carousel and Schedule */}
        <div className="flex-grow flex flex-col items-center justify-center max-w-md w-full relative z-10">
          
          {/* Card Frame */}
          <div className="w-full bg-white/[0.02] border border-white/[0.06] rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden min-h-[420px] justify-between backdrop-blur-xl">
            
            {/* Visual illustration slider */}
            <div className="w-full flex-1 flex flex-col justify-center select-none">
              <div className="mb-6 w-full flex justify-center">
                {carouselSlides[carouselIndex].element}
              </div>
              
              <h3 className="text-sm font-black uppercase tracking-wider text-white mb-2">
                {carouselSlides[carouselIndex].title}
              </h3>
              
              <p className="text-xs text-slate-450 px-6 max-w-sm mx-auto leading-relaxed">
                {carouselSlides[carouselIndex].description}
              </p>
            </div>

            {/* Slider dots indicator controls */}
            <div className="flex gap-2.5 py-4 shrink-0">
              {carouselSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCarouselIndex(idx)}
                  className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                    carouselIndex === idx ? 'bg-cyan-400 scale-110 shadow-lg shadow-cyan-400/50' : 'bg-slate-800'
                  }`}
                  title={`Go to slide ${idx + 1}`}
                  type="button"
                />
              ))}
            </div>

            {/* Timetable schedule section — STRICT EMPTY STATE */}
            <div className="border-t border-white/[0.04] w-full pt-4 mt-2 shrink-0">
              <div className="flex flex-col items-center justify-center p-2">
                <div className="flex items-center gap-2 text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase tracking-widest">Nothing scheduled today</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* --- SHARE MEETING LINK POPUP MODAL --- */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute right-4 top-4 p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-colors cursor-pointer flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white mb-2 pr-6">
              AeroMeet Meeting Coordinates
            </h3>
            
            <p className="text-xs text-slate-450 leading-relaxed mb-4">
              Copy this link and send it to people you want to meet with. Make sure you save it so you can use it later.
            </p>

            <div className="flex items-center gap-2 bg-slate-950 border border-slate-850 p-3 rounded-xl mb-4 select-all shadow-inner">
              <span className="text-xs font-mono text-cyan-400 truncate flex-1">{generatedLink}</span>
              <button 
                onClick={handleCopyLink}
                className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-slate-900 rounded-lg shrink-0 transition-colors cursor-pointer flex items-center justify-center border border-transparent"
                title="Copy link to clipboard"
              >
                {copySuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={() => {
                setShowShareModal(false);
                const parts = generatedLink.split('/');
                router.push(`/room/${parts[parts.length - 2]}/join`);
              }}
              className="w-full py-3.5 bg-[#5B5FC7] hover:bg-[#474aac] text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg transition-colors cursor-pointer"
            >
              Enter meeting lobby
            </button>

          </div>
        </div>
      )}

    </div>
  );
}