'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Voicemail, Users, Hash, Phone, Video, PhoneOff,
  Search, Delete, Volume2, Mic, MicOff, VideoOff, Info, UserCheck, ShieldAlert
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Avatar } from '@/components/ui/Avatar';
import { User } from '@/types';

// Dial Pad Keys
const DIAL_KEYS = [
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

export default function PhonePage() {
  const { user } = useAuth();
  const router = useRouter();

  // Dial States
  const [number, setNumber] = useState('');
  
  // Call States
  const [callActive, setCallActive] = useState(false);
  const [callTimer, setCallTimer] = useState('00:00');
  const [callName, setCallName] = useState('');
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(true);

  // Contacts States
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Fetch Contacts
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

  // Call timer simulation
  useEffect(() => {
    let interval: any;
    if (callActive) {
      let seconds = 0;
      interval = setInterval(() => {
        seconds++;
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        setCallTimer(`${mins}:${secs}`);
      }, 1000);
    } else {
      setCallTimer('00:00');
    }
    return () => clearInterval(interval);
  }, [callActive]);

  const pressKey = (digit: string) => {
    setNumber((prev) => (prev.length < 15 ? prev + digit : prev));
  };

  const backspace = () => {
    setNumber((prev) => prev.slice(0, -1));
  };

  const handleDialCall = (targetName?: string) => {
    if (targetName) setCallName(targetName);
    else if (number) setCallName(number);
    else setCallName('Unknown Participant');
    
    setCallActive(true);
  };

  const handleEndCall = () => {
    setCallActive(false);
    setNumber('');
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-800 font-outfit select-none overflow-hidden">
      
      {/* Top Header Row */}
      <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Phone className="w-5 h-5 text-indigo-600" />
          <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-outfit">Calling & SIP Center</h1>
        </div>
        
        {user && (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">SIP Registered: {user.name}</span>
          </div>
        )}
      </div>

      {/* 3-Panel Calling Hub Grid */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Panel 1: Left Dialpad Column */}
        <div className="w-full lg:w-80 border-r border-slate-200 bg-white flex flex-col justify-center px-6 py-6 shrink-0">
          <div className="w-full max-w-[260px] mx-auto flex flex-col gap-6">
            
            {/* Dialpad Number Display */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 min-h-[48px]">
              <span className="text-2xl font-bold font-mono tracking-widest text-slate-800 flex-1 text-center truncate">
                {number || <span className="text-slate-350 text-sm font-bold tracking-normal uppercase not-italic font-outfit">Ready to Dial</span>}
              </span>
              {number && (
                <button
                  onClick={backspace}
                  className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1 bg-transparent border-none"
                  title="Backspace"
                >
                  <Delete size={18} />
                </button>
              )}
            </div>

            {/* Circular Key Grid */}
            <div className="grid grid-cols-3 gap-3 justify-items-center w-full">
              {DIAL_KEYS.map(({ digit, letters }) => (
                <button
                  key={digit}
                  onClick={() => pressKey(digit)}
                  className="w-14 h-14 rounded-full flex flex-col items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer select-none active:scale-95 active:bg-indigo-50 shadow-xs border-solid"
                >
                  <span className="text-lg font-bold text-slate-800 leading-none">{digit}</span>
                  {letters && (
                    <span className="text-[8px] font-bold tracking-widest text-slate-400 mt-0.5 uppercase">{letters}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Calling Trigger button */}
            <div className="flex justify-center pt-2">
              <button
                onClick={() => handleDialCall()}
                disabled={callActive}
                className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-500/20 flex items-center justify-center transition-all cursor-pointer active:scale-95 border-none"
              >
                <Phone size={20} className="text-white" />
              </button>
            </div>

          </div>
        </div>

        {/* Panel 2: Center Ongoing Call Widget Column */}
        <div className="flex-1 border-r border-slate-200 bg-slate-50/40 flex items-center justify-center p-6">
          {callActive ? (
            /* Active Call Panel Card Layout */
            <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-sm w-full shadow-lg flex flex-col items-center text-center gap-6 animate-scaleIn">
              
              {/* Call Status Head */}
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-150 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-emerald-700 animate-pulse">
                  Active Call
                </div>
                <h3 className="text-lg font-bold text-slate-800 mt-2">{callName}</h3>
                <p className="text-xs font-mono font-bold text-slate-500 tracking-widest">{callTimer}</p>
              </div>

              {/* Call avatar placeholder */}
              <div className="w-24 h-24 rounded-full bg-slate-50 border border-slate-200/60 flex items-center justify-center shadow-inner relative">
                <Avatar name={callName} size="lg" />
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white" />
              </div>

              {/* In-Call Controls Layout grid */}
              <div className="grid grid-cols-3 gap-4 w-full px-4">
                <button
                  onClick={() => setMuted(!muted)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    muted 
                      ? 'bg-rose-50 border-rose-200 text-rose-600' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {muted ? <MicOff size={16} /> : <Mic size={16} />}
                  <span>Mute</span>
                </button>

                <button
                  onClick={() => setSpeaker(!speaker)}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    speaker 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                      : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  <Volume2 size={16} />
                  <span>Speaker</span>
                </button>

                <button className="flex flex-col items-center gap-1.5 p-2 rounded-xl border bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700 text-xs font-bold transition-colors cursor-pointer">
                  <VideoOff size={16} />
                  <span>Video</span>
                </button>
              </div>

              {/* End Call Button */}
              <button
                onClick={handleEndCall}
                className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-2xl transition-colors cursor-pointer shadow-lg shadow-rose-500/10 border-none"
              >
                <div className="flex items-center justify-center gap-2">
                  <PhoneOff size={15} /> End Connection
                </div>
              </button>

            </div>
          ) : (
            /* Idle Screen Placeholder */
            <div className="text-center space-y-4 max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 mx-auto shadow-sm">
                <Hash size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-700">Call center is idle</h3>
                <p className="text-xs text-slate-450 mt-1 max-w-[240px] mx-auto leading-relaxed">
                  Enter an extension number on the dialpad or click phone icons on the contacts directory to start calls.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Panel 3: Right Contacts & Directory Column */}
        <div className="w-full lg:w-80 bg-white flex flex-col overflow-hidden shrink-0">
          
          {/* Header Search block */}
          <div className="p-4 border-b border-slate-150 shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 text-left">SIP Directory</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search phone book..."
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500/40 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 outline-none transition-colors font-outfit"
              />
            </div>
          </div>

          {/* Directory Contact List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-14 bg-slate-50 border border-slate-200/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-bold uppercase tracking-wider">No contacts found</div>
            ) : (
              contacts.map(c => (
                <div 
                  key={c.id} 
                  className="p-3 border border-slate-150 bg-white rounded-2xl flex items-center justify-between hover:bg-slate-50/50 hover:border-slate-200 transition-colors group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={c.name} src={c.avatarUrl} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate leading-none">{c.name}</p>
                      <span className="text-[10px] text-slate-400 font-bold block mt-1">Available</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDialCall(c.name)}
                    className="p-2 bg-slate-50 border border-slate-200 hover:border-indigo-500 hover:bg-white text-slate-500 hover:text-indigo-650 rounded-xl transition-colors cursor-pointer"
                  >
                    <Phone size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
