'use client';

import React, { useState, useEffect } from 'react';
import { 
  Clapperboard, Play, Search, Plus, Sparkles, Clock, Calendar, 
  Download, Share2, Eye, X, Check, Volume2, Maximize, Scissors,
  Trash2, Split, ZoomIn, ZoomOut, Pause
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import api from '@/lib/api';

interface Clip {
  id: string;
  title: string;
  duration: string;
  createdAt: string;
  views: number;
  thumbnailGradient: string;
  videoUrl?: string;
  transcript: string;
}

export default function ClipsPage() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [activeClip, setActiveClip] = useState<Clip | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState(false);
  const [timelinePlayhead, setTimelinePlayhead] = useState(0); // percentage

  useEffect(() => {
    async function loadRecordings() {
      try {
        setLoading(true);
        const res = await api.get('/meetings');
        if (res.data.success) {
          const fetchedMeetings = res.data.meetings || [];
          const recordings = fetchedMeetings
            .filter((m: any) => m.recordingUrl)
            .map((m: any, idx: number) => {
              const gradients = [
                'from-blue-600 to-indigo-650',
                'from-indigo-605 to-purple-650',
                'from-emerald-600 to-teal-650',
                'from-rose-600 to-pink-650'
              ];
              const gradient = gradients[idx % gradients.length];
              return {
                id: m.id,
                title: m.title,
                duration: '02:30',
                createdAt: new Date(m.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }),
                views: 0,
                thumbnailGradient: gradient,
                videoUrl: m.recordingUrl,
                transcript: 'No transcription available for this recording.'
              };
            });
          setClips(recordings);
          if (recordings.length > 0) {
            setActiveClip(recordings[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load recordings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadRecordings();
  }, []);

  const handleShareClip = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/clips?id=${clipId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(clipId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] text-slate-800 font-outfit select-none overflow-hidden">
      
      {/* Top Header Row */}
      <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <Clapperboard className="w-5 h-5 text-indigo-650" />
          <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Media & Clips Studio</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-indigo-650">
            <Sparkles className="w-3 h-3 text-indigo-600" /> Editor Active
          </div>
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Left Workspace Panel: Player & Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
          
          {/* Active Clip Preview Stage */}
          <div className="flex-1 bg-slate-900 p-6 flex items-center justify-center relative overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Syncing recordings...</span>
              </div>
            ) : clips.length === 0 ? (
              <div className="max-w-md w-full bg-slate-950 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-14 h-14 rounded-full bg-slate-900 flex items-center justify-center text-slate-500 mb-4 border border-slate-800 shadow-inner">
                  <Clapperboard className="w-6 h-6 text-slate-450" />
                </div>
                <h3 className="text-white font-bold text-sm tracking-tight">No recordings found</h3>
                <p className="text-slate-450 text-xs mt-1.5 leading-relaxed max-w-[280px]">
                  When you record video calls in AeroMeet, they will appear here automatically as editable clips.
                </p>
              </div>
            ) : activeClip ? (
              <div className="w-full max-w-2xl aspect-video bg-slate-950 rounded-2xl overflow-hidden shadow-2xl relative flex flex-col justify-between group border border-slate-800">
                <div className={`flex-1 w-full bg-gradient-to-tr ${activeClip.thumbnailGradient} relative flex items-center justify-center`}>
                  <div className="absolute inset-0 bg-[radial-gradient(#ffffff15_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
                  
                  {playingVideo ? (
                    <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-2 border-slate-800 border-t-indigo-500 rounded-full animate-spin" />
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Streaming Clip segments...</span>
                      <button 
                        onClick={() => setPlayingVideo(false)}
                        className="py-1 px-3.5 bg-slate-900 hover:bg-slate-850 text-white rounded-xl text-[10px] font-bold uppercase border border-slate-800 cursor-pointer"
                      >
                        Pause
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="absolute inset-0 bg-black/30" />
                      <button 
                        onClick={() => setPlayingVideo(true)}
                        className="w-16 h-16 rounded-full bg-white/95 hover:bg-white text-indigo-600 flex items-center justify-center shadow-2xl transition-transform hover:scale-105 cursor-pointer border-none"
                      >
                        <Play className="w-6 h-6 fill-current ml-1" />
                      </button>
                    </>
                  )}
                </div>

                {/* Video controls toolbar */}
                <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-slate-400 text-xs">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setPlayingVideo(!playingVideo)}
                      className="text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
                    >
                      {playingVideo ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <span className="font-mono text-[10px]">0:00 / {activeClip.duration}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-4 h-4 hover:text-white cursor-pointer" />
                    <Maximize className="w-4 h-4 hover:text-white cursor-pointer" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                Select a clip from the library to load in editor
              </div>
            )}
          </div>

          {/* Bottom Editing Timeline Control */}
          <div className="h-48 border-t border-slate-200 bg-white flex flex-col justify-between shrink-0">
            {/* Timeline toolbar */}
            <div className="h-10 border-b border-slate-150 px-4 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-1.5 text-slate-500">
                <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors" title="Cut/Split Clip">
                  <Scissors size={13} />
                </button>
                <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-rose-600 transition-colors" title="Delete Track">
                  <Trash2 size={13} />
                </button>
                <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-indigo-600 transition-colors" title="Split Screen">
                  <Split size={13} />
                </button>
                <span className="w-px h-4 bg-slate-200 mx-1" />
                <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
                  <ZoomIn size={13} />
                </button>
                <button className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors">
                  <ZoomOut size={13} />
                </button>
              </div>
              
              <div className="text-[10px] font-mono font-bold text-slate-400 tracking-wider">
                Timeline Edit Room
              </div>
            </div>

            {/* Timeline Tracks Grid */}
            <div className="flex-1 relative overflow-hidden flex flex-col justify-center gap-1 px-4 py-2 bg-slate-50/30">
              {/* Playhead Indicator Line */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-10 pointer-events-none"
                style={{ left: `${timelinePlayhead}%` }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 absolute -top-1 -left-1 ring-2 ring-white shadow-xs" />
              </div>

              {/* Video Track */}
              <div className="h-9 bg-slate-100 border border-slate-200 rounded-xl relative flex items-center px-3 gap-2 overflow-hidden cursor-pointer">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest shrink-0 w-12 text-left">Video</span>
                {activeClip && (
                  <div className={`h-6 rounded-lg bg-gradient-to-r ${activeClip.thumbnailGradient} border border-indigo-400 opacity-80 flex-1 relative`}>
                    <div className="absolute inset-y-0 left-0 w-2.5 bg-indigo-650/40 cursor-ew-resize rounded-l-md" />
                    <div className="absolute inset-y-0 right-0 w-2.5 bg-indigo-650/40 cursor-ew-resize rounded-r-md" />
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-white uppercase tracking-wider">{activeClip.title}</span>
                  </div>
                )}
              </div>

              {/* Audio Track */}
              <div className="h-9 bg-slate-100 border border-slate-200 rounded-xl relative flex items-center px-3 gap-2 overflow-hidden cursor-pointer">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest shrink-0 w-12 text-left">Audio</span>
                {activeClip && (
                  <div className="h-6 rounded-lg bg-indigo-50 border border-indigo-200 flex-1 relative flex items-center justify-between px-2 text-indigo-600 overflow-hidden">
                    {/* Visual Audio Waveform bar placeholders */}
                    <div className="flex items-center gap-0.5 w-full opacity-60">
                      {[2, 4, 3, 5, 2, 6, 4, 3, 2, 5, 6, 7, 3, 4, 2, 5, 4, 3, 6, 4, 3, 2, 5, 4, 6, 7, 3, 2, 4, 5, 3, 6, 2].map((h, i) => (
                        <div key={i} className="flex-1 bg-indigo-550 rounded-sm" style={{ height: `${h * 2.5}px` }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timeline Time Indicators */}
            <div className="h-6 border-t border-slate-150 bg-slate-50 flex items-center px-16 justify-between select-none">
              {['0:00', '0:30', '1:00', '1:30', '2:00', '2:30', '3:00'].map((time, idx) => (
                <div key={idx} className="text-[9px] font-mono font-bold text-slate-400">
                  {time}
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Right Workspace Panel: Library & Transcript */}
        <div className="w-80 bg-white flex flex-col overflow-hidden">
          
          {/* Library Section */}
          <div className="p-4 border-b border-slate-200 shrink-0">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recorded Library</h2>
            <p className="text-[9px] text-slate-405 font-bold uppercase tracking-wider mt-0.5">Choose clip to edit</p>
            
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto scrollbar-thin">
              {loading ? (
                <p className="text-[10px] text-slate-400 px-2 italic py-2">Loading library...</p>
              ) : clips.length === 0 ? (
                <p className="text-[10px] text-slate-400 px-2 italic py-2">No recorded sessions available.</p>
              ) : (
                clips.map(c => {
                  const isSelected = activeClip?.id === c.id;
                  return (
                    <div 
                      key={c.id}
                      onClick={() => {
                        setActiveClip(c);
                        setPlayingVideo(false);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-indigo-50/50 border-indigo-150 shadow-xs' 
                          : 'border-slate-150 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className={`w-12 aspect-video rounded-lg bg-gradient-to-tr ${c.thumbnailGradient} shrink-0`} />
                      <div className="min-w-0 flex-1 text-left leading-tight">
                        <p className="text-xs font-bold text-slate-700 truncate">{c.title}</p>
                        <span className="text-[9px] font-mono text-slate-400 font-bold block mt-1">{c.duration} • {c.createdAt}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Transcript / AI Workspace */}
          <div className="flex-1 flex flex-col justify-between overflow-hidden">
            <div className="p-4 border-b border-slate-150 bg-slate-50 shrink-0 text-left leading-tight">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">AI Transcript</h3>
              <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-0.5">Synchronized audio notes</p>
            </div>

            <div className="flex-1 p-4 overflow-y-auto text-left leading-relaxed text-xs text-slate-600 font-semibold italic bg-white select-text scrollbar-thin">
              {activeClip ? (
                `"${activeClip.transcript}"`
              ) : (
                "Select a clip to review voice transcription data."
              )}
            </div>

            <div className="p-4 border-t border-slate-150 bg-white shrink-0 flex gap-2">
              <button 
                onClick={() => alert('Clip download initiated.')}
                className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm flex items-center justify-center gap-1.5 border-none"
              >
                <Download className="w-3.5 h-3.5" /> Download Raw Clip
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
