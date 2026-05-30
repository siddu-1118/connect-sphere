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
    title: 'Share your coordinate link',
    description: 'Initialize a new sync room to generate coordinates you can share with your team spheres.',
    svg: (
      <svg className="w-64 h-48 mx-auto" viewBox="0 0 200 150" fill="none">
        <circle cx="100" cy="75" r="50" fill="rgba(6, 182, 212, 0.05)" />
        <rect x="70" y="65" width="60" height="20" rx="10" fill="#22d3ee" opacity="0.8" />
        <path d="M85 75h30" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="85" cy="75" r="4" fill="#FFF" />
        <circle cx="115" cy="75" r="4" fill="#FFF" />
        <path d="M125 50l15-15m-55 70l-15 15" stroke="#5B5FC7" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
    ),
  },
  {
    title: 'Plan ahead in Orbits',
    description: 'Coordinate session times inside the AeroMeet Calendar and send invitations to orbits.',
    svg: (
      <svg className="w-64 h-48 mx-auto" viewBox="0 0 200 150" fill="none">
        <circle cx="100" cy="75" r="50" fill="rgba(91, 95, 199, 0.05)" />
        <rect x="75" y="50" width="50" height="50" rx="8" fill="#5B5FC7" opacity="0.8" />
        <rect x="75" y="50" width="50" height="12" rx="4" fill="#474aac" />
        <circle cx="90" cy="72" r="3" fill="#FFF" />
        <circle cx="100" cy="72" r="3" fill="#FFF" />
        <circle cx="110" cy="72" r="3" fill="#FFF" />
        <rect x="85" y="82" width="30" height="5" rx="2.5" fill="#FFF" />
      </svg>
    ),
  },
  {
    title: 'Your stage is encrypted',
    description: 'Enjoy secure video grid connections. Admission requires host authorization or direct invites.',
    svg: (
      <svg className="w-64 h-48 mx-auto" viewBox="0 0 200 150" fill="none">
        <circle cx="100" cy="75" r="50" fill="rgba(34, 211, 238, 0.05)" />
        <rect x="80" y="60" width="40" height="35" rx="6" fill="#22d3ee" opacity="0.9" />
        <path d="M90 60v-8c0-5.5 4.5-10 10-10s10 4.5 10 10v8" stroke="#22d3ee" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="75" r="3" fill="#0f172a" />
        <path d="M100 78v6" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" />
      </svg>
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
      <div className="min-h-screen bg-slate-955 flex items-center justify-center font-sans">
        <div className="w-10 h-10 rounded-full border-4 border-t-cyan-400 border-slate-900 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-955 text-slate-100 flex flex-col font-sans relative overflow-hidden select-none">
      
      {/* Background visual glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#5B5FC7]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] bg-[#22d3ee]/5 blur-[120px] rounded-full pointer-events-none" />

      {/* 1. Header Toolbar */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-slate-900 bg-slate-950/40 backdrop-blur-xl z-20">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
            <Compass className="w-4 h-4" />
          </div>
          <span className="text-lg font-medium tracking-tight text-slate-350 select-none">
            Aero <strong className="font-extrabold text-cyan-400">Meet</strong>
          </span>
        </div>

        {/* Right Info and Profile controls */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center text-xs text-slate-450 font-bold uppercase tracking-wider select-none">
            <span>{timeStr}</span>
            <span className="mx-2 text-slate-600">•</span>
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
                    <div className="flex flex-col items-center border-b border-slate-800 pb-3 mb-3">
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
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center px-6 md:px-16 max-w-7xl mx-auto w-full gap-12 lg:gap-16 pt-8 pb-16 z-10">
        
        {/* Left Side: Onboarding meeting actions */}
        <div className="flex-1 space-y-6 max-w-lg w-full text-center lg:text-left">
          
          <h1 className="text-4xl md:text-[44px] leading-[1.15] font-normal tracking-tight text-white">
            Premium call coordinates.<br />
            Now free for your teams.
          </h1>

          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-md font-light">
            Coordinate organizational spheres, map channel orbits, sketch specs on collaborative whiteboards, and launch secure video sync stages on any device.
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
            <form onSubmit={handleJoinClick} className="w-full sm:w-auto flex items-center gap-3 flex-1 max-w-xs">
              <div className="relative flex-1">
                <Video className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-550 select-none" />
                <input
                  type="text"
                  placeholder="Enter room code or link"
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  className="w-full pl-11 pr-3 py-3.5 border border-slate-800 rounded-xl text-xs bg-slate-950/60 focus:outline-none focus:border-[#5B5FC7] focus:ring-0 placeholder-slate-600 text-slate-200"
                />
              </div>

              <button
                type="submit"
                disabled={!meetingCode.trim()}
                className="text-xs font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 disabled:text-slate-600 px-4 py-3 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed select-none"
              >
                Join
              </button>
            </form>

          </div>

          <div className="border-t border-slate-900 pt-4 mt-6">
            <p className="text-xs text-slate-500 font-normal leading-relaxed">
              <span className="text-cyan-400">Secure Stage Infrastructure</span>. Fully encrypted P2P peer calls.
            </p>
          </div>

        </div>

        {/* Right Side: Showcase Carousel and Schedule */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full relative">
          
          {/* Card Frame */}
          <div className="w-full bg-slate-900/30 border border-slate-900 rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center relative overflow-hidden min-h-[380px] justify-between backdrop-blur-xl">
            
            {/* Visual illustration slider */}
            <div className="w-full flex-1 flex flex-col justify-center select-none">
              <div className="mb-4">
                {carouselSlides[carouselIndex].svg}
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
                />
              ))}
            </div>

            {/* Timetable schedule section — STRICT EMPTY STATE */}
            <div className="border-t border-slate-900 w-full pt-4 mt-2 shrink-0">
              <div className="flex flex-col items-center justify-center p-4">
                <Calendar className="w-5 h-5 text-slate-600 mb-1.5" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nothing scheduled today</span>
                <p className="text-[9px] text-slate-600 mt-1 max-w-[200px] leading-relaxed">Use Calendar planner slots to schedule upcoming coordinate calls.</p>
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