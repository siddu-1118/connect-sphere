'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Play, Video, Plus, Shield, ShieldAlert, DoorOpen, Clock, 
  Sparkles, Grid, Sliders, Trash2, Check, UserPlus
} from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

interface RoomData {
  id: string;
  name: string;
  members: string[];
}

export default function RoomDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Rooms lists
  const [rooms, setRooms] = useState<RoomData[]>([
    { id: 'room-1', name: 'Room 1', members: ['Anya', 'Felix', 'Aneka'] },
    { id: 'room-2', name: 'Room 2', members: ['Aks', 'Bob', 'Jack'] },
    { id: 'room-3', name: 'Room 3', members: ['Siddharth', 'Charlie'] },
  ]);

  // Breakout state
  const [timerMinutes, setTimerMinutes] = useState(4);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const [roomsActive, setRoomsActive] = useState(true);

  // Timer countdown hook
  useEffect(() => {
    if (!roomsActive) return;
    const interval = setInterval(() => {
      if (timerSeconds > 0) {
        setTimerSeconds(s => s - 1);
      } else if (timerMinutes > 0) {
        setTimerMinutes(m => m - 1);
        setTimerSeconds(59);
      } else {
        setRoomsActive(false);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [timerMinutes, timerSeconds, roomsActive]);

  const handleCreateRoom = () => {
    const nextNum = rooms.length + 1;
    const newRoom: RoomData = {
      id: `room-${Date.now()}`,
      name: `Room ${nextNum}`,
      members: []
    };
    setRooms([...rooms, newRoom]);
  };

  const handleEndRooms = () => {
    setRoomsActive(false);
    setTimerMinutes(0);
    setTimerSeconds(0);
    alert('Breakout rooms ended.');
  };

  const handleSortRooms = () => {
    // Shuffle members
    const allMembers = rooms.flatMap(r => r.members);
    const shuffled = [...allMembers].sort(() => Math.random() - 0.5);
    const newRooms = rooms.map((r, i) => {
      const chunk = shuffled.slice(i * 2, (i + 1) * 2);
      return { ...r, members: chunk };
    });
    setRooms(newRooms);
  };

  const handleJoinMain = () => {
    const code = Math.random().toString(36).slice(2, 11);
    router.push(`/meet/${code}`);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-800 overflow-hidden font-outfit relative">
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[380px] h-[380px] bg-indigo-500/2 rounded-full blur-[130px] -z-10 pointer-events-none" />

      {/* Top App Bar */}
      <header className="h-16 shrink-0 flex items-center justify-between px-6 bg-white border-b border-slate-100 z-10 select-none shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-605">
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <h1 className="text-sm font-black text-slate-700 uppercase tracking-widest">Room Dashboard</h1>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-full py-1.5 pl-3 pr-1.5 select-none shrink-0">
          <p className="text-xs font-bold text-slate-700 hidden sm:block">{user?.name ?? 'Explorer'}</p>
          <Avatar name={user?.name ?? 'U'} src={user?.avatarUrl} size="sm" className="border border-indigo-500/25 shadow-sm" />
        </div>
      </header>

      {/* Grid panels */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-6 md:p-8 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left Area: Active Breakout feed */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Breakout rooms grid */}
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 text-left">Breakout Rooms</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {rooms.map(r => (
                <div key={r.id} className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm flex flex-col justify-between min-h-[140px] text-left">
                  <div>
                    <h3 className="text-sm font-black text-slate-750">{r.name}</h3>
                    <p className="text-[10px] text-slate-455 mt-1">{r.members.length} Active member{r.members.length !== 1 ? 's' : ''}</p>
                  </div>
                  
                  {r.members.length > 0 ? (
                    <div className="flex -space-x-2.5 overflow-hidden my-3">
                      {r.members.map(m => (
                        <Avatar key={m} name={m} size="sm" className="border-2 border-white ring-1 ring-slate-100" />
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 italic my-3 block">No members inside</span>
                  )}
                  
                  <button 
                    onClick={() => router.push(`/meet/${r.id}`)}
                    className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 hover:border-indigo-250 text-indigo-650 text-xs font-bold rounded-xl transition-all"
                  >
                    Enter Room
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Main Feed preview */}
          <div className="flex-1 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between text-left min-h-[220px]">
            <div>
              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-md px-2 py-0.5 uppercase tracking-wider">Main Room Feed</span>
              <h3 className="text-base font-black text-slate-800 mt-3">General Broadcast Stage</h3>
              <p className="text-xs text-slate-455 mt-1">Join the main meeting presentation to speak to all participants simultaneously.</p>
            </div>
            
            <div className="w-full aspect-video md:aspect-auto md:h-36 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-400 mt-4 overflow-hidden relative">
              <Avatar name={user?.name ?? 'You'} src={user?.avatarUrl} size="lg" className="border-4 border-slate-800 scale-105" />
              <div className="absolute bottom-3 left-3 bg-slate-950/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-slate-200">
                Main Room Broadcast Preview
              </div>
            </div>

            <button 
              onClick={handleJoinMain}
              className="mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md shadow-indigo-605/20 border-0 flex items-center justify-center gap-1.5"
            >
              <Video size={13} className="stroke-[2.5]" /> Connect to Broadcast
            </button>
          </div>
        </div>

        {/* Right Area: Control Sidebar */}
        <div className="w-full lg:w-80 shrink-0 bg-white border border-slate-150 rounded-3xl p-6 shadow-sm flex flex-col gap-6 text-left">
          
          {/* Breakout Controller */}
          <div>
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Breakout Control</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center text-center mt-3">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-500" />
                <span className="text-2xl font-mono font-bold text-slate-750 tabular-nums">
                  {timerMinutes}:{String(timerSeconds).padStart(2, '0')}
                </span>
              </div>
              <p className="text-[10px] text-slate-455 mt-1">Remaining side discussion session time</p>
            </div>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Action List */}
          <div className="space-y-3">
            <button 
              onClick={handleSortRooms}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sliders size={13} /> Sort Rooms
            </button>

            <button 
              onClick={handleCreateRoom}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus size={13} /> Create Breakout
            </button>

            <button 
              onClick={handleEndRooms}
              className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-650 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 size={13} /> End Rooms
            </button>
          </div>

          <div className="h-px bg-slate-100" />

          {/* Active members lists */}
          <div className="flex-1 flex flex-col justify-between min-h-[160px]">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Room list</h3>
              <div className="space-y-3 max-h-[180px] overflow-y-auto scrollbar-thin pr-1">
                {rooms.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-xs font-bold text-slate-700">{r.name}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-50 border border-slate-150 text-[9px] font-bold text-slate-500">
                      {r.members.length} Users
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
