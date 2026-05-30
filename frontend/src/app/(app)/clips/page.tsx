'use client';

import React, { useState } from 'react';
import { 
  Clapperboard, Play, Search, Plus, Sparkles, Clock, Calendar, 
  Download, Share2, Eye, X, Check, Volume2, Maximize, AlertCircle 
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';

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
  // Strict empty states: no pre-populated mock arrays
  const [clips, setClips] = useState<Clip[]>([]);

  const [activeClip, setActiveClip] = useState<Clip | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingVideo, setPlayingVideo] = useState(false);

  const handleShareClip = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const link = `${window.location.origin}/clips?id=${clipId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(clipId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Top Banner Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-5">
        <div>
          <div className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">
            <Sparkles className="w-3 h-3 text-blue-400" /> Cloud Media Hub
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight leading-none">
            Workspace Screenshare Clips
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review archived screenshares, cloud recorded conference calls, and async presentation videos.
          </p>
        </div>
      </div>

      {/* Grid of Clips preview cards */}
      {clips.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="No recorded clips"
          description="Your screenshare recordings and call archives will show up here. Use the record toggle during active calls to generate clips."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {clips.map(clip => (
            <div 
              key={clip.id}
              onClick={() => {
                setActiveClip(clip);
                setPlayingVideo(false);
              }}
              className="group bg-slate-900 border border-slate-800 hover:border-slate-700/60 rounded-3xl overflow-hidden shadow-xl flex flex-col justify-between transition-all hover:-translate-y-1 cursor-pointer"
            >
              <div className={`aspect-video w-full bg-gradient-to-tr ${clip.thumbnailGradient} relative flex items-center justify-center`}>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]" />
                
                <div className="w-12 h-12 rounded-full bg-slate-950/80 hover:bg-slate-950 border border-white/10 flex items-center justify-center text-white shadow-2xl transition-transform group-hover:scale-110">
                  <Play className="w-5 h-5 fill-current ml-0.5 text-blue-400" />
                </div>

                <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md border border-white/5 rounded-xl px-2.5 py-1 text-[10px] font-bold font-mono text-white">
                  {clip.duration}
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Screenshare Clip</h3>
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors leading-snug">
                    {clip.title}
                  </h4>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-3 border-t border-slate-900">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {clip.createdAt}</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {clip.views} Views</span>
                  
                  <button
                    onClick={(e) => handleShareClip(clip.id, e)}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Copy share link"
                  >
                    {copiedId === clip.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* --- PLAYBACK SCREEN MODAL VIEW --- */}
      {activeClip && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setActiveClip(null)}>
          <div 
            className="w-full max-w-4xl bg-slate-950 border border-slate-855 rounded-3xl overflow-hidden shadow-2xl relative animate-slideUp flex flex-col lg:flex-row h-[550px]"
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setActiveClip(null)} 
              className="absolute right-4 top-4 text-slate-500 hover:text-white z-30 w-7 h-7 rounded-full bg-slate-950/80 border border-slate-800 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex-1 bg-slate-950 flex flex-col justify-between relative border-b lg:border-b-0 lg:border-r border-slate-905 h-1/2 lg:h-full">
              <div className={`flex-1 w-full bg-gradient-to-tr ${activeClip.thumbnailGradient} relative flex items-center justify-center overflow-hidden`}>
                {playingVideo ? (
                  <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 border-2 border-slate-800 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Loading video segments...</span>
                    
                    <button 
                      onClick={() => setPlayingVideo(false)}
                      className="mt-2 py-1.5 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-850 text-white rounded-xl text-[9px] font-bold uppercase tracking-wider"
                    >
                      Pause
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-black/40" />
                    <button 
                      onClick={() => setPlayingVideo(true)}
                      className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-105 relative z-10 cursor-pointer"
                    >
                      <Play className="w-6 h-6 fill-current ml-1" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-4 left-4 right-4 bg-slate-950/80 border border-white/5 backdrop-blur-md rounded-2xl px-4 py-2 flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-mono text-[10px]">0:00 / {activeClip.duration}</span>
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-4 h-4" />
                    <Maximize className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-950/60">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-1">Archived Call</h3>
                <h4 className="text-base font-black text-white leading-snug">{activeClip.title}</h4>
              </div>
            </div>

            <div className="w-full lg:w-80 bg-slate-950 flex flex-col justify-between h-1/2 lg:h-full">
              <div className="p-4 border-b border-slate-905 bg-slate-950/40">
                <h4 className="text-xs font-black uppercase tracking-widest text-white">AI Transcript</h4>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Synchronized voice transcription</p>
              </div>

              <div className="flex-1 p-5 overflow-y-auto scrollbar-thin text-xs text-slate-400 leading-relaxed font-medium italic">
                "{activeClip.transcript}"
              </div>

              <div className="p-4 border-t border-slate-905 bg-slate-950/20">
                <Button 
                  onClick={() => alert('Clip download initiated.')}
                  variant="primary" 
                  className="w-full py-3 text-xs font-black uppercase tracking-wider bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/10"
                >
                  <Download className="w-4 h-4" /> Download Raw Clip
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
